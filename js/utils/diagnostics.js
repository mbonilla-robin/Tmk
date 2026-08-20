const ROBIN_DIAG_LOG_KEY = "robin_diag_log_v1";
const ROBIN_DIAG_MAX = 40;

function registrarDiagnosticoRobin(categoria, mensaje, detalle) {
  const entrada = {
    at: new Date().toISOString(),
    categoria: String(categoria || "general"),
    mensaje: String(mensaje || "").slice(0, 500),
    detalle: detalle ? String(detalle).slice(0, 2000) : ""
  };

  try {
    const prev = JSON.parse(getLocalStorageItemSafe(ROBIN_DIAG_LOG_KEY, "[]") || "[]");
    const lista = Array.isArray(prev) ? prev : [];
    lista.unshift(entrada);
    setLocalStorageItemSafe(ROBIN_DIAG_LOG_KEY, JSON.stringify(lista.slice(0, ROBIN_DIAG_MAX)));
  } catch (e) {
    console.warn("ROBIN diag", entrada);
  }

  return entrada;
}

function leerDiagnosticoRobin() {
  try {
    const raw = getLocalStorageItemSafe(ROBIN_DIAG_LOG_KEY, "[]");
    const lista = JSON.parse(raw || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

function limpiarDiagnosticoRobin() {
  try {
    setLocalStorageItemSafe(ROBIN_DIAG_LOG_KEY, "[]");
  } catch (e) { /* ignore */ }
}

function resumirEstadoSyncRobin(opts) {
  const {
    apiError,
    apiErrorDetail,
    hayPendientesLocales,
    syncing,
    loading,
    colaPendiente
  } = opts || {};

  const backendOk = typeof backendRobinListo === "function"
    ? backendRobinListo()
    : (typeof entregablesSupabaseListos === "function" && entregablesSupabaseListos());

  if (!backendOk) {
    return {
      estado: "sin_api",
      titulo: "Base de datos no configurada",
      detalle: "No hay proyecto de Supabase configurado en esta instalación.",
      severidad: "warn"
    };
  }

  if (syncing || loading) {
    return {
      estado: "sincronizando",
      titulo: "Sincronizando entregables…",
      detalle: "",
      severidad: "info"
    };
  }

  const pendientes = typeof colaPendiente === "number"
    ? colaPendiente
    : (typeof hayPendientesSync === "function" && hayPendientesSync() ? 1 : 0);

  if (apiError) {
    return {
      estado: "error",
      titulo: apiError,
      detalle: apiErrorDetail || "Los cambios se guardan en este dispositivo y se reintentará el envío.",
      severidad: "error"
    };
  }

  if (pendientes > 0) {
    return {
      estado: "pendiente",
      titulo: "Cambios pendientes de subir",
      detalle: `${pendientes} operación(es) en cola local. Se reintentará automáticamente.`,
      severidad: "warn"
    };
  }

  return {
    estado: "ok",
    titulo: "Sincronizado con Supabase",
    detalle: "La información de este dispositivo está al día con la base de datos.",
    severidad: "ok"
  };
}

function escapeHtmlPortapapeles(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textoAHtmlParrafos(texto) {
  const bloques = String(texto || "").trim().split(/\n{2,}/);
  const inner = bloques.map((bloque) => {
    const html = escapeHtmlPortapapeles(bloque).replace(/\n/g, "<br>");
    return `<p>${html}</p>`;
  }).join("");
  return `<html><body><!--StartFragment-->${inner}<!--EndFragment--></body></html>`;
}

function copiarTextoAlPortapapeles(texto) {
  const val = String(texto || "");
  if (!val) return Promise.resolve(false);
  const html = textoAHtmlParrafos(val);

  const copiarConTextarea = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = val;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return Promise.resolve(!!ok);
    } catch (e) {
      return Promise.resolve(false);
    }
  };

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
    try {
      const item = new ClipboardItem({
        "text/plain": new Blob([val], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" })
      });
      return navigator.clipboard.write([item]).then(() => true).catch(() => {
        if (navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(val).then(() => true).catch(() => copiarConTextarea());
        }
        return copiarConTextarea();
      });
    } catch (e) {
      // Safari a veces exige Promises dentro de ClipboardItem
    }
  }

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
    try {
      const item = new ClipboardItem({
        "text/plain": Promise.resolve(new Blob([val], { type: "text/plain" })),
        "text/html": Promise.resolve(new Blob([html], { type: "text/html" }))
      });
      return navigator.clipboard.write([item]).then(() => true).catch(() => {
        if (navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(val).then(() => true).catch(() => copiarConTextarea());
        }
        return copiarConTextarea();
      });
    } catch (e) {
      // seguir al fallback
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(val).then(() => true).catch(() => copiarConTextarea());
  }

  return copiarConTextarea();
}

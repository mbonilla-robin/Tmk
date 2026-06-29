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

  if (!isApiConfigured()) {
    return {
      estado: "sin_api",
      titulo: "Base de datos no configurada",
      detalle: "No hay URL del Web App de Google Sheets en esta instalación.",
      severidad: "warn"
    };
  }

  if (syncing || loading) {
    return {
      estado: "sincronizando",
      titulo: "Sincronizando con Google Sheets…",
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
      detalle: apiErrorDetail || "Los cambios se guardan en este dispositivo y se reintentará el envío a Sheets.",
      severidad: "error"
    };
  }

  if (pendientes > 0 || hayPendientesLocales) {
    return {
      estado: "pendiente",
      titulo: "Cambios pendientes de subir a Sheets",
      detalle: pendientes > 0
        ? `${pendientes} operación(es) en cola local. Se reintentará automáticamente.`
        : "Hay cambios locales esperando sincronización.",
      severidad: "warn"
    };
  }

  return {
    estado: "ok",
    titulo: "Sincronizado con Google Sheets",
    detalle: "La información de este dispositivo está al día con la base de datos.",
    severidad: "ok"
  };
}

function copiarTextoAlPortapapeles(texto) {
  const val = String(texto || "");
  if (!val) return Promise.resolve(false);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(val).then(() => true).catch(() => false);
  }

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
    return Promise.resolve(ok);
  } catch (e) {
    return Promise.resolve(false);
  }
}

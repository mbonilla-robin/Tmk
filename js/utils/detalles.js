const ROBIN_LINK_RE = /<!--\s*robin-link:([^>]+?)\s*-->/i;
const ROBIN_SUBCLIENTE_RE = /<!--\s*robin-subcliente:([^>]+?)\s*-->/i;
const ROBIN_FLUJO_RE = /<!--\s*robin-flujo:([^>]+?)\s*-->/i;
const ROBIN_IMPORT_KEY_RE = /<!--\s*robin-import-key:([^>]+?)\s*-->/i;
const ROBIN_ENVIO_TIPO_RE = /<!--\s*robin-envio-tipo:([^>]+?)\s*-->/i;
const ROBIN_PENDIENTE_COR_RE = /<!--\s*robin-pendiente-cor:([^>]+?)\s*-->/i;
const ROBIN_MEDIDAS_RE = /<!--\s*robin-medidas:([^>]+?)\s*-->/i;
const HISTORIAL_LINE_RE = /^•\s*\[(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\]\s*(.+)$/;
const MEDIDAS_BLOQUE_RE = /(?:^|\n)\s*MEDIDAS:\s*[^\n]*(?:\n(?!\s*\n)[^\n]*)*$/i;
const UNIDADES_MEDIDA = [
  { id: "m", label: "Metros", corto: "m" },
  { id: "cm", label: "Centímetros", corto: "cm" },
  { id: "mm", label: "Milímetros", corto: "mm" }
];

function extraerMarcadorLink(text) {
  const raw = String(text || "");
  const match = raw.match(ROBIN_LINK_RE);
  if (!match) return { link: "", resto: raw };
  return {
    link: normalizarUrlEnlace(match[1].trim()),
    resto: raw.replace(ROBIN_LINK_RE, "").trim()
  };
}

function extraerMarcadorSubcliente(text) {
  const raw = String(text || "");
  const match = raw.match(ROBIN_SUBCLIENTE_RE);
  if (!match) return { subcliente: "", resto: raw };
  const nombre = typeof normalizarNombreSubcliente === "function"
    ? normalizarNombreSubcliente(match[1])
    : String(match[1] || "").trim();
  return {
    subcliente: nombre,
    resto: raw.replace(ROBIN_SUBCLIENTE_RE, "").trim()
  };
}

function extraerMarcadorFlujo(text) {
  const raw = String(text || "");
  const match = raw.match(ROBIN_FLUJO_RE);
  if (!match) return { flujo: "", resto: raw };
  return {
    flujo: String(match[1] || "").trim().toLowerCase(),
    resto: raw.replace(ROBIN_FLUJO_RE, "").trim()
  };
}

function extraerMarcadorImportKey(text) {
  const raw = String(text || "");
  const match = raw.match(ROBIN_IMPORT_KEY_RE);
  if (!match) return { importKey: "", resto: raw };
  return {
    importKey: String(match[1] || "").trim(),
    resto: raw.replace(ROBIN_IMPORT_KEY_RE, "").trim()
  };
}

function extraerMarcadorEnvioTipo(text) {
  const raw = String(text || "");
  const match = raw.match(ROBIN_ENVIO_TIPO_RE);
  if (!match) return { envioTipo: "", resto: raw };
  const val = String(match[1] || "").trim().toLowerCase();
  const envioTipo = val === "arte-final" || val === "propuesta" ? val : "";
  return {
    envioTipo,
    resto: raw.replace(ROBIN_ENVIO_TIPO_RE, "").trim()
  };
}

function extraerMarcadorPendienteCor(text) {
  const raw = String(text || "");
  const match = raw.match(ROBIN_PENDIENTE_COR_RE);
  if (!match) return { pendienteCor: false, resto: raw };
  const val = String(match[1] || "").trim().toLowerCase();
  const pendienteCor = val === "1" || val === "true" || val === "si" || val === "sí";
  return {
    pendienteCor,
    resto: raw.replace(ROBIN_PENDIENTE_COR_RE, "").trim()
  };
}

function unidadMedidaValida(val) {
  const u = String(val || "").trim().toLowerCase();
  return u === "m" || u === "cm" || u === "mm" ? u : "cm";
}

function medidasVacias() {
  return { activo: false, ancho: "", alto: "", profundidad: "", unidad: "cm" };
}

function normalizarNumeroMedida(val) {
  const s = String(val || "").trim().replace(",", ".");
  if (!s) return "";
  if (!/^\d+(\.\d+)?$/.test(s)) return String(val || "").trim();
  return s;
}

function normalizarMedidas(raw) {
  const base = medidasVacias();
  if (!raw || typeof raw !== "object") return base;
  const medidas = {
    ancho: normalizarNumeroMedida(raw.ancho),
    alto: normalizarNumeroMedida(raw.alto),
    profundidad: normalizarNumeroMedida(raw.profundidad),
    unidad: unidadMedidaValida(raw.unidad)
  };
  medidas.activo = raw.activo === true || medidasTieneValor(medidas);
  return medidas;
}

function medidasTieneValor(medidas) {
  if (!medidas) return false;
  return Boolean(medidas.ancho || medidas.alto || medidas.profundidad);
}

function medidasParaGuardar(medidas) {
  const n = normalizarMedidas(medidas);
  if (!n.activo || !medidasTieneValor(n)) return null;
  return {
    ancho: n.ancho,
    alto: n.alto,
    profundidad: n.profundidad,
    unidad: n.unidad
  };
}

function etiquetaUnidadMedida(unidad) {
  const u = unidadMedidaValida(unidad);
  const hit = UNIDADES_MEDIDA.find((item) => item.id === u);
  return hit ? hit.corto : "cm";
}

function textoMedidasParaCor(medidas) {
  const n = medidasParaGuardar(medidas) || (medidasTieneValor(medidas) ? normalizarMedidas(medidas) : null);
  if (!n) return "";
  const u = etiquetaUnidadMedida(n.unidad);
  const partes = [];
  if (n.ancho) partes.push(`${n.ancho} ${u} (ancho)`);
  if (n.alto) partes.push(`${n.alto} ${u} (alto)`);
  if (n.profundidad) partes.push(`${n.profundidad} ${u} (profundidad)`);
  return partes.length ? `MEDIDAS: ${partes.join(" x ")}` : "";
}

function extraerMarcadorMedidas(text) {
  const raw = String(text || "");
  const match = raw.match(ROBIN_MEDIDAS_RE);
  if (!match) return { medidas: null, resto: raw };
  const partes = String(match[1] || "").split("|").map((p) => p.trim());
  const medidas = medidasParaGuardar({
    ancho: partes[0] || "",
    alto: partes[1] || "",
    profundidad: partes[2] || "",
    unidad: partes[3] || "cm",
    activo: true
  });
  return {
    medidas,
    resto: raw.replace(ROBIN_MEDIDAS_RE, "").trim()
  };
}

function serializarMarcadorMedidas(medidas) {
  const n = medidasParaGuardar(medidas);
  if (!n) return "";
  return `<!--robin-medidas:${n.ancho}|${n.alto}|${n.profundidad}|${n.unidad}-->`;
}

function quitarBloqueMedidasDeTexto(texto) {
  return String(texto || "").replace(MEDIDAS_BLOQUE_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

function extrasDetallesCon(parsed, extra) {
  const base = parsed && typeof parsed === "object" ? parsed : {};
  const e = extra && typeof extra === "object" ? extra : {};
  return {
    flujo: e.flujo != null ? e.flujo : (base.flujo || ""),
    importKey: e.importKey != null ? e.importKey : (base.importKey || ""),
    envioTipo: e.envioTipo != null ? e.envioTipo : (base.envioTipo || ""),
    pendienteCor: e.pendienteCor != null ? e.pendienteCor : Boolean(base.pendienteCor),
    medidas: e.medidas !== undefined ? e.medidas : (base.medidas || null)
  };
}

function parseDetalles(detallesRaw) {
  const sinLink = extraerMarcadorLink(detallesRaw || "");
  const sinSub = extraerMarcadorSubcliente(sinLink.resto);
  const sinFlujo = extraerMarcadorFlujo(sinSub.resto);
  const sinImport = extraerMarcadorImportKey(sinFlujo.resto);
  const sinEnvio = extraerMarcadorEnvioTipo(sinImport.resto);
  const sinPendiente = extraerMarcadorPendienteCor(sinEnvio.resto);
  const { medidas, resto } = extraerMarcadorMedidas(sinPendiente.resto);
  const pendienteCor = sinPendiente.pendienteCor;
  const subcliente = sinSub.subcliente;
  const flujo = sinFlujo.flujo;
  const importKey = sinImport.importKey;
  const envioTipo = sinEnvio.envioTipo;
  const lines = resto.split("\n");
  const notasLines = [];
  const subtareas = [];
  const historial = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("• [")) {
      historial.push(trimmed);
    } else if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]") || trimmed.startsWith("* [ ]") || trimmed.startsWith("* [x]")) {
      const completed = trimmed.includes("[x]");
      const taskText = trimmed.replace(/^[-*]\s*\[[ x]\]\s*/, "");
      subtareas.push({ text: taskText, completed });
    } else if (trimmed !== "") {
      notasLines.push(line);
    }
  });

  return {
    link: sinLink.link,
    subcliente,
    flujo,
    importKey,
    envioTipo,
    pendienteCor,
    medidas,
    notas: notasLines.join("\n"),
    subtareas,
    historial
  };
}

function serializeDetalles(notas, subtareas, historial, link, subcliente, extras) {
  let text = (notas || "").trim();
  if (subtareas && subtareas.length > 0) {
    const subtasksText = subtareas.map(s => `- [${s.completed ? "x" : " "}] ${s.text}`).join("\n");
    text = text ? `${text}\n\n${subtasksText}` : subtasksText;
  }
  if (historial && historial.length > 0) {
    const historialText = historial.join("\n");
    text = text ? `${text}\n\n${historialText}` : historialText;
  }
  const markers = [];
  const linkNorm = normalizarUrlEnlace(link);
  if (linkNorm) markers.push(`<!--robin-link:${linkNorm}-->`);
  const subNorm = typeof normalizarNombreSubcliente === "function"
    ? normalizarNombreSubcliente(subcliente)
    : String(subcliente || "").trim();
  if (subNorm) markers.push(`<!--robin-subcliente:${subNorm}-->`);
  const flujoNorm = String(extras?.flujo || "").trim().toLowerCase();
  if (flujoNorm) markers.push(`<!--robin-flujo:${flujoNorm}-->`);
  const importKeyNorm = String(extras?.importKey || "").trim();
  if (importKeyNorm) markers.push(`<!--robin-import-key:${importKeyNorm}-->`);
  const envioTipoNorm = String(extras?.envioTipo || "").trim().toLowerCase();
  if (envioTipoNorm === "propuesta" || envioTipoNorm === "arte-final") {
    markers.push(`<!--robin-envio-tipo:${envioTipoNorm}-->`);
  }
  if (extras?.pendienteCor) {
    markers.push("<!--robin-pendiente-cor:1-->");
  }
  const medidasMarker = serializarMarcadorMedidas(extras?.medidas);
  if (medidasMarker) markers.push(medidasMarker);
  if (markers.length) {
    const prefix = markers.join("\n");
    text = text ? `${prefix}\n${text}` : prefix;
  }
  return text;
}

function obtenerAnioReferenciaTarea(tarea) {
  const td = obtenerTiempoFecha(tarea?.deadline);
  if (td !== Infinity) return new Date(td).getFullYear();
  const ti = obtenerTiempoFecha(tarea?.fechaInicio);
  if (ti !== Infinity) return new Date(ti).getFullYear();
  return new Date().getFullYear();
}

function formatearEtiquetaActividad(texto) {
  const limpio = String(texto || "").trim();
  const mEstado = limpio.match(/^Estado cambiado a "([^"]+)" por/i);
  if (mEstado) return `Cambió a ${mEstado[1]}`;

  if (/^Creado por/i.test(limpio)) return "Entregable creado";

  const mEdit = limpio.match(/^Editado \((.+)\) por/i);
  if (mEdit) return `Editado: ${mEdit[1]}`;

  return limpio.replace(/\s+por @[\w.]+\.?$/i, "").trim();
}

function parsearLineaHistorial(line, anioRef) {
  const m = String(line || "").trim().match(HISTORIAL_LINE_RE);
  if (!m) return null;

  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const hora = parseInt(m[3], 10);
  const min = parseInt(m[4], 10);
  const resto = m[5].trim();
  const anio = anioRef || new Date().getFullYear();
  const fecha = new Date(anio, mes - 1, dia, hora, min);

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  let tipo = "editado";
  if (/^Creado por/i.test(resto)) tipo = "creado";
  else if (/^Estado cambiado/i.test(resto)) tipo = "estado";

  return {
    fecha,
    timestamp: fecha.getTime(),
    tipo,
    texto: resto,
    etiqueta: formatearEtiquetaActividad(resto),
    hora: `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}`
  };
}

function extraerActividadesDeTarea(tarea) {
  if (!tarea) return [];
  const parsed = parseDetalles(tarea.detalles || "");
  const anioHint = obtenerAnioReferenciaTarea(tarea);

  return parsed.historial
    .map((line, idx) => {
      const entry = parsearLineaHistorial(line, anioHint);
      if (!entry) return null;
      return {
        id: `${getTaskSelectionKey(tarea)}-act-${idx}`,
        tarea,
        ...entry
      };
    })
    .filter(Boolean);
}

function construirIndiceActividadesPorDia(tareas) {
  const map = new Map();

  (tareas || []).forEach((t) => {
    extraerActividadesDeTarea(t).forEach((act) => {
      const dayTs = new Date(
        act.fecha.getFullYear(),
        act.fecha.getMonth(),
        act.fecha.getDate()
      ).getTime();
      if (!map.has(dayTs)) map.set(dayTs, []);
      map.get(dayTs).push(act);
    });
  });

  map.forEach((lista) => lista.sort((a, b) => a.timestamp - b.timestamp));
  return map;
}

function actividadesParaFecha(indice, date) {
  if (!indice || !date) return [];
  const ts = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return indice.get(ts) || [];
}

function obtenerLinkTarea(tarea) {
  if (!tarea) return "";
  if (tarea.link) return normalizarUrlEnlace(tarea.link);
  return parseDetalles(tarea.detalles || "").link || "";
}

function obtenerSubclienteDesdeDetalles(tarea) {
  if (!tarea) return "";
  if (tarea.subcliente) {
    return typeof normalizarNombreSubcliente === "function"
      ? normalizarNombreSubcliente(tarea.subcliente)
      : String(tarea.subcliente).trim();
  }
  return parseDetalles(tarea.detalles || "").subcliente || "";
}

function normalizarUrlEnlace(val) {
  let s = String(val || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}

function escaparHtmlTexto(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linkificarTextoPlano(text) {
  const escaped = escaparHtmlTexto(text);
  return escaped.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/gi,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
}

function linkificarHtmlNotas(html) {
  if (!html || typeof document === "undefined") return html || "";
  const div = document.createElement("div");
  div.innerHTML = html;
  const urlRe = /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g;
  const textNodes = [];
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((textNode) => {
    const parent = textNode.parentElement;
    if (!parent || parent.closest("a")) return;
    const text = textNode.textContent || "";
    if (!urlRe.test(text)) return;
    urlRe.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let match;
    while ((match = urlRe.exec(text)) !== null) {
      if (match.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      }
      const a = document.createElement("a");
      a.href = match[0];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = match[0];
      frag.appendChild(a);
      last = match.index + match[0].length;
    }
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    parent.replaceChild(frag, textNode);
  });

  return div.innerHTML;
}

function htmlNotasAPlainText(html) {
  const raw = String(html || "").trim();
  if (!raw) return "";
  if (typeof document === "undefined" || !/<[a-z][\s\S]*>/i.test(raw)) return raw;
  const div = document.createElement("div");
  div.innerHTML = raw;
  return (div.innerText || div.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

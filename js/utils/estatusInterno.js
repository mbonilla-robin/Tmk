const ESTATUS_INTERNO_MARCA = "La Santé";
const ESTATUS_FLUJO_POR_ENVIAR = "por-enviar";
const ESTATUS_FLUJO_ESPERA = "espera-cliente";
const ESTATUS_DISENADORES_BASE = ["agraterol", "dmatheus"];
const ESTATUS_CARGA_COLORES = ["#1B4332", "#2F7A4E", "#40916C", "#74C69D", "#B7E4C7"];
const ESTATUS_PALABRAS_CORTAS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "en", "para", "con", "a", "al", "un", "una", "por"]);
const ESTATUS_SIGLAS = new Set(["otc", "af", "qr", "cor", "pop", "tmk", "phq", "ls", "er"]);

const ESTATUS_CSV_A_ESTADO = {
  "stand-by": "En pausa",
  "standby": "En pausa",
  "stand by": "En pausa",
  "entregado a cliente": "Completada",
  "entregado": "Completada",
  "espera por cliente": "Seguimiento",
  "por enviar a cliente": "En revisión",
  "por enviar": "En revisión",
  "diseñar": "En progreso",
  "ajuste": "En revisión",
  "en desarrollo": "En progreso",
  "en proceso": "En progreso",
  "no iniciado": "Pendiente"
};

function claveEstatusInterno(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parsearCsvEstatus(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const raw = String(text || "");
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function filaCsvTieneInfo(cells) {
  return (cells || []).some((c) => String(c || "").trim());
}

function extraerFilasEstatusDesdeCsv(text) {
  const rows = parsearCsvEstatus(text);
  const headerIdx = rows.findIndex((r) => claveEstatusInterno(r[0]).includes("cadena"));
  if (headerIdx < 0) return { filas: [], omitidasVacias: 0, omitidasSinEntregable: 0 };

  const data = rows.slice(headerIdx + 1);
  const filas = [];
  const notasDeCadena = new Map();
  let omitidasVacias = 0;
  let omitidasSinEntregable = 0;
  let lastLinkByCadena = new Map();

  data.forEach((r) => {
    const cadena = String(r[0] || "").trim();
    const entregable = String(r[1] || "").trim();
    const comentarios = String(r[7] || "").trim();
    const link = String(r[8] || "").trim();

    if (!filaCsvTieneInfo(r) || (!cadena && !entregable)) {
      omitidasVacias += 1;
      lastLinkByCadena = new Map();
      return;
    }

    if (link && cadena) lastLinkByCadena.set(cadena, link);

    if (!entregable) {
      omitidasSinEntregable += 1;
      if (cadena && (comentarios || link)) {
        const prev = notasDeCadena.get(cadena) || { comentarios: [], link: "" };
        if (comentarios) prev.comentarios.push(comentarios);
        if (link) prev.link = link;
        notasDeCadena.set(cadena, prev);
      }
      return;
    }

    const inheritedLink = link || lastLinkByCadena.get(cadena) || "";
    if (inheritedLink) lastLinkByCadena.set(cadena, inheritedLink);

    filas.push({
      cadena,
      entregable,
      solicitud: String(r[2] || "").trim(),
      entrega: String(r[3] || "").trim(),
      status: String(r[4] || "").trim(),
      responsable: String(r[5] || "").trim(),
      detalles: String(r[6] || "").trim(),
      comentarios,
      link: inheritedLink
    });
  });

  let currentCadena = "";
  let currentLink = "";
  filas.forEach((row) => {
    if (row.cadena !== currentCadena) {
      currentCadena = row.cadena;
      currentLink = row.link || "";
    }
    if (row.link) currentLink = row.link;
    else if (currentLink) row.link = currentLink;
  });

  filas.forEach((row) => {
    const extra = notasDeCadena.get(row.cadena);
    if (!extra) return;
    if (!row.link && extra.link) row.link = extra.link;
    if (extra.comentarios.length && !extra.appliedComment) {
      const nota = extra.comentarios.join("\n");
      row.comentarios = row.comentarios ? `${row.comentarios}\n${nota}` : nota;
      extra.appliedComment = true;
    }
  });

  return { filas, omitidasVacias, omitidasSinEntregable };
}

function mapearEstadoDesdeCsv(statusRaw) {
  const clave = claveEstatusInterno(statusRaw).replace(/_/g, " ");
  return ESTATUS_CSV_A_ESTADO[clave] || "Pendiente";
}

function flujoDesdeStatusCsv(statusRaw) {
  const clave = claveEstatusInterno(statusRaw);
  if (clave.includes("por enviar")) return ESTATUS_FLUJO_POR_ENVIAR;
  if (clave.includes("espera por cliente")) return ESTATUS_FLUJO_ESPERA;
  return "";
}

function fechaDesdeCsvEstatus(val) {
  let s = String(val || "").trim();
  if (!s || /^tbd$/i.test(s) || s === "-") return "";
  const compacto = s.match(/^(\d{1,2})\/(\d{2})(\d{4})$/);
  if (compacto) s = `${compacto[1]}/${compacto[2]}/${compacto[3]}`;
  if (typeof formatearFechaDisplay === "function") {
    const formatted = formatearFechaDisplay(s);
    return typeof esFechaValida === "function" && esFechaValida(formatted) ? formatted : "";
  }
  return s;
}

function entregableLegibleEstatus(valor) {
  return typeof textoEstatusLegible === "function"
    ? textoEstatusLegible(valor)
    : String(valor || "").replace(/\s+/g, " ").trim();
}

function truncarSubclienteEstatus(nombre) {
  const limpio = entregableLegibleEstatus(nombre) || String(nombre || "").replace(/\s+/g, " ").trim();
  if (!limpio) return "";
  if (typeof normalizarNombreSubcliente === "function") {
    const norm = normalizarNombreSubcliente(limpio);
    if (norm) return norm;
  }
  return limpio.slice(0, 48);
}

function personasDesdeResponsableCsv(responsableRaw) {
  const ejecutivo = "@gnebrus";
  const raw = String(responsableRaw || "").trim();
  const clave = claveEstatusInterno(raw);
  if (!clave || clave === "n/a" || clave === "por asignar" || clave === "na") {
    return ejecutivo;
  }

  const handles = [ejecutivo];
  const agregar = (handle) => {
    if (!handles.includes(handle)) handles.push(handle);
  };

  if (clave.includes("dani") && clave.includes("gene")) {
    agregar("@dsalavarria");
    return handles.join(", ");
  }
  if (clave.includes("dani")) agregar("@dsalavarria");
  if (clave.includes("aaron")) agregar("@agraterol");
  if (clave.includes("david")) agregar("@dmatheus");
  if (clave.includes("jesus") || clave.includes("jesús")) agregar("@jalfiero");
  if (clave.includes("gene")) agregar("@gnebrus");
  if (clave.includes("miguel") || clave.includes("migue")) agregar("@mbonilla");

  if (handles.length === 1 && typeof resolverHandleCanonico === "function") {
    const extra = resolverHandleCanonico(raw);
    if (extra) agregar(`@${extra}`);
  }

  return typeof normalizarCampoPersonas === "function"
    ? normalizarCampoPersonas(handles.join(", "))
    : handles.join(", ");
}

function claveImportacionEstatus(fila) {
  const base = [
    claveEstatusInterno(ESTATUS_INTERNO_MARCA),
    claveEstatusInterno(fila.cadena),
    claveEstatusInterno(fila.entregable),
    claveEstatusInterno(fila.detalles).slice(0, 48),
    claveEstatusInterno(fila.solicitud)
  ].join("|");
  return base.slice(0, 120);
}

function obtenerFlujoTarea(tarea) {
  if (!tarea) return "";
  if (tarea.flujo) return String(tarea.flujo).trim().toLowerCase();
  if (typeof parseDetalles === "function") {
    return parseDetalles(tarea.detalles || "").flujo || "";
  }
  return "";
}

function obtenerImportKeyTarea(tarea) {
  if (!tarea) return "";
  if (tarea.importKey) return String(tarea.importKey).trim();
  if (typeof parseDetalles === "function") {
    return parseDetalles(tarea.detalles || "").importKey || "";
  }
  return "";
}

function obtenerEnvioTipoTarea(tarea) {
  if (!tarea) return "";
  if (tarea.envioTipo) return String(tarea.envioTipo).trim().toLowerCase();
  if (typeof parseDetalles === "function") {
    return parseDetalles(tarea.detalles || "").envioTipo || "";
  }
  return "";
}

function inferirEnvioTipoEstatus(t, fila, blob) {
  const previo = obtenerEnvioTipoTarea(t);
  if (previo === "propuesta" || previo === "arte-final") return previo;
  const texto = claveEstatusInterno([
    blob,
    fila?.comentarios,
    fila?.status,
    fila?.detalles,
    t?.info
  ].filter(Boolean).join(" "));
  if (texto.includes("arte final") || texto.includes("enviar af") || /\baf\b/.test(texto)) return "arte-final";
  if (texto.includes("propuesta")) return "propuesta";
  if (texto.includes("ajuste") && texto.includes("cor")) return "arte-final";
  return "propuesta";
}

function etiquetaEnvioTipoEstatus(tarea, filasRef) {
  const fila = (filasRef || []).find((f) => tareaCoincideFilaEstatus(tarea, f));
  const parsed = typeof parseDetalles === "function" ? parseDetalles(tarea?.detalles || "") : { notas: tarea?.detalles || "" };
  const partes = notasYComentarioEstatus(parsed.notas);
  const blob = [partes.comentario, partes.notas, fila && fila.comentarios, fila && fila.status].filter(Boolean).join("\n");
  const tipo = inferirEnvioTipoEstatus(tarea, fila, blob);
  if (tipo === "arte-final") return "Arte final";
  if (tipo === "propuesta") return "Propuesta";
  return "";
}

function aplicarEnvioTipoEstatus(tarea, tipo, extras) {
  if (!tarea) return tarea;
  const parsed = typeof parseDetalles === "function"
    ? parseDetalles(tarea.detalles || "")
    : { notas: tarea.detalles || "", subtareas: [], historial: [], link: tarea.link, subcliente: tarea.subcliente, importKey: tarea.importKey, flujo: tarea.flujo, envioTipo: tarea.envioTipo };
  const envioTipo = tipo === "arte-final" ? "arte-final" : (tipo === "propuesta" ? "propuesta" : "");
  const importKey = parsed.importKey || tarea.importKey || "";
  const sub = parsed.subcliente || (typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(tarea) : tarea.subcliente);
  const flujo = extras?.flujo != null ? extras.flujo : (parsed.flujo || tarea.flujo || "");
  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(parsed.notas, parsed.subtareas || [], parsed.historial || [], parsed.link || tarea.link, sub, { flujo, importKey, envioTipo })
    : tarea.detalles;
  return { ...tarea, envioTipo, flujo, importKey, detalles };
}

function claveImportNormalizada(valor) {
  return String(valor || "").trim().toLowerCase();
}

function idImportacionEstatus(fila) {
  const key = claveImportacionEstatus(fila);
  let hashA = 0;
  let hashB = 5381;
  for (let i = 0; i < key.length; i++) {
    const ch = key.charCodeAt(i);
    hashA = ((hashA << 5) - hashA) + ch;
    hashA |= 0;
    hashB = ((hashB * 33) ^ ch) >>> 0;
  }
  const cadena = claveEstatusInterno(fila.cadena).replace(/[^a-z0-9]/g, "").slice(0, 8);
  const parteA = Math.abs(hashA).toString(36);
  const parteB = Math.abs(hashB).toString(36);
  const huella = `${parteA}${parteB}`.slice(0, 16);
  return `IMP-${huella}${cadena ? `-${cadena}` : ""}`;
}

function tituloEstatusParaMatch(info, cadena) {
  const limpio = typeof textoEstatusEntregable === "function"
    ? textoEstatusEntregable(info, cadena)
    : String(info || "");
  const sinCategoria = typeof extraerTituloLimpio === "function"
    ? extraerTituloLimpio(limpio)
    : limpio;
  return claveEstatusInterno(sinCategoria);
}

function esTituloExhibidorBroxol(info, cadena) {
  const titulo = tituloEstatusParaMatch(info, cadena);
  const cad = claveEstatusInterno(cadena);
  return cad.includes("otc") && titulo.includes("exhibidor") && titulo.includes("broxol");
}

function esTituloRistraBroxol(info, cadena) {
  const titulo = tituloEstatusParaMatch(info, cadena);
  const cad = claveEstatusInterno(cadena);
  return cad.includes("otc") && titulo.includes("ristra") && titulo.includes("broxol") && !titulo.includes("exhibidor");
}

function esTituloTiqueteraStickers(info, cadena) {
  const titulo = tituloEstatusParaMatch(info, cadena);
  if (!titulo.includes("tiquetera") && !titulo.includes("ticketera")) return false;
  return titulo.includes("sticker") || titulo.includes("671") || titulo.includes("la-671");
}

function titulosEstatusEquivalentes(infoTarea, entregableFila, cadena) {
  const a = tituloEstatusParaMatch(infoTarea, cadena);
  const b = tituloEstatusParaMatch(entregableFila, cadena);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(`${b} (`) || b.startsWith(`${a} (`)) return true;
  if (esTituloRistraBroxol(infoTarea, cadena) && esTituloRistraBroxol(entregableFila, cadena)) return true;
  if (esTituloExhibidorBroxol(infoTarea, cadena) && esTituloExhibidorBroxol(entregableFila, cadena)) return true;
  if (esTituloTiqueteraStickers(infoTarea, cadena) && esTituloTiqueteraStickers(entregableFila, cadena)) return true;
  return false;
}

function tareaCoincideFilaEstatus(tarea, fila) {
  if (!tarea || !fila) return false;
  const key = obtenerImportKeyTarea(tarea);
  if (key && key === claveImportacionEstatus(fila)) return true;

  const cadena = typeof obtenerSubclienteTarea === "function"
    ? obtenerSubclienteTarea(tarea)
    : String(tarea.subcliente || "").trim();
  const mismaCadena = typeof subclientesCoinciden === "function"
    ? subclientesCoinciden(cadena, fila.cadena)
    : claveEstatusInterno(cadena) === claveEstatusInterno(fila.cadena);
  if (!mismaCadena) return false;
  return titulosEstatusEquivalentes(tarea.info, fila.entregable, cadena || fila.cadena);
}

function yaEnvioArteFinalEstatus(tarea) {
  const blob = String(tarea?.detalles || "").toLowerCase();
  return blob.includes("envió arte final al cliente") || blob.includes("envio arte final al cliente");
}

function usuarioMarcoEstadoEstatus(tarea, estadoBuscado) {
  const blob = String(tarea?.detalles || "");
  const objetivo = String(estadoBuscado || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`estado cambiado a "${objetivo}"`, "i").test(blob);
}

function estadoRobinEstatus(tarea) {
  return typeof cleanEstado === "function"
    ? cleanEstado(tarea?.estado)
    : String(tarea?.estado || "").toLowerCase();
}

function flujoDesdeEstadoRobin(estadoRaw) {
  const estado = typeof cleanEstado === "function" ? cleanEstado(estadoRaw) : String(estadoRaw || "").toLowerCase();
  if (estado === "seguimiento") return ESTATUS_FLUJO_ESPERA;
  // cleanEstado suele normalizar como "en revision" (sin tilde).
  // Aceptamos ambas variantes por compatibilidad.
  if (estado === "en revision" || estado === "en revisión") return ESTATUS_FLUJO_POR_ENVIAR;
  return "";
}

function aplicarFlujoSegunEstadoEstatus(tarea, estadoNuevo) {
  if (!tarea) return tarea;
  const estado = estadoNuevo != null ? estadoNuevo : tarea.estado;
  const flujo = flujoDesdeEstadoRobin(estado);
  const parsed = typeof parseDetalles === "function"
    ? parseDetalles(tarea.detalles || "")
    : { notas: tarea.detalles || "", subtareas: [], historial: [], link: tarea.link, subcliente: tarea.subcliente, importKey: tarea.importKey, envioTipo: tarea.envioTipo };
  const importKey = parsed.importKey || tarea.importKey || "";
  const sub = parsed.subcliente || (typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(tarea) : tarea.subcliente);
  const filas = filasEstatusReferencia();
  const fila = filas.find((f) => tareaCoincideFilaEstatus(tarea, f));
  const partes = notasYComentarioEstatus(parsed.notas);
  const blob = [partes.comentario, partes.notas, fila && fila.comentarios, fila && fila.status].filter(Boolean).join("\n");
  let envioTipo = parsed.envioTipo || tarea.envioTipo || "";
  if (flujo === ESTATUS_FLUJO_POR_ENVIAR) {
    envioTipo = inferirEnvioTipoEstatus(tarea, fila, blob) || "propuesta";
  } else if (flujo !== ESTATUS_FLUJO_ESPERA) {
    envioTipo = "";
  }
  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(parsed.notas, parsed.subtareas || [], parsed.historial || [], parsed.link || tarea.link, sub, { flujo, importKey, envioTipo })
    : tarea.detalles;
  return { ...tarea, estado, flujo, importKey, envioTipo, detalles };
}

function textoIndicaPorEnviar(texto) {
  const clave = claveEstatusInterno(texto);
  if (!clave || clave.includes("ok por enviar")) return false;
  return clave.includes("por enviar a cliente") || /^por enviar(\s|\||$)/.test(clave);
}

function usuarioMarcoEnRevisionEstatus(tarea) {
  return usuarioMarcoEstadoEstatus(tarea, "En revision")
    || usuarioMarcoEstadoEstatus(tarea, "En revisión");
}

function debeIrPorEnviarEstatus(t, filasRef, flujo, estado, blob, fila) {
  if (flujo === ESTATUS_FLUJO_POR_ENVIAR) return true;
  if (fila && flujoDesdeStatusCsv(fila.status) === ESTATUS_FLUJO_POR_ENVIAR) return true;
  if (textoIndicaPorEnviar(blob)) return true;
  // Tareas manuales (sin fila CSV) marcadas en revision por el usuario.
  if (estado === "en revision" && !fila && usuarioMarcoEnRevisionEstatus(t)) return true;
  return false;
}

function filasEstatusReferencia(filas) {
  if (filas && filas.length) return filas;
  return typeof ESTATUS_LA_SANTE_IMPORT_ROWS !== "undefined" ? ESTATUS_LA_SANTE_IMPORT_ROWS : [];
}

function notasYComentarioEstatus(notasRaw) {
  const texto = typeof htmlNotasAPlainText === "function"
    ? htmlNotasAPlainText(notasRaw)
    : String(notasRaw || "").trim();
  if (!texto) return { notas: "", comentario: "" };
  const soloComentario = texto.match(/^Comentario:\s*([\s\S]+)$/i);
  if (soloComentario) return { notas: "", comentario: soloComentario[1].trim() };
  const match = texto.match(/^([\s\S]*?)\n+Comentario:\s*([\s\S]+)$/i);
  if (!match) return { notas: texto, comentario: "" };
  return { notas: match[1].trim(), comentario: match[2].trim() };
}

function construirNotasEstatus(detalles, comentarios) {
  const partes = [];
  if (String(detalles || "").trim()) partes.push(String(detalles).trim());
  if (String(comentarios || "").trim()) partes.push(`Comentario: ${String(comentarios).trim()}`);
  return partes.join("\n\n");
}

function construirTareaDesdeFilaEstatus(fila, usuario) {
  const subcliente = truncarSubclienteEstatus(fila.cadena);
  const estado = typeof normalizarEstado === "function"
    ? normalizarEstado(mapearEstadoDesdeCsv(fila.status))
    : mapearEstadoDesdeCsv(fila.status);
  const flujo = flujoDesdeStatusCsv(fila.status);
  const importKey = claveImportacionEstatus(fila);
  const fechaInicio = fechaDesdeCsvEstatus(fila.solicitud);
  const deadline = fechaDesdeCsvEstatus(fila.entrega) || fechaInicio;
  const notasBase = construirNotasEstatus(fila.detalles, fila.comentarios);
  const responsableClave = claveEstatusInterno(fila.responsable);
  const notas = responsableClave.includes("melanie")
    ? [notasBase, "Responsable original: Melanie"].filter(Boolean).join("\n\n")
    : notasBase;
  const prioridad = "Media";
  const historial = [];
  if (usuario) {
    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, "0")}`;
    historial.push(`• [${timestamp}] Creado por @${String(usuario).replace(/^@/, "")}`);
  }
  const blob = [fila.comentarios, fila.status, fila.detalles].filter(Boolean).join("\n");
  const envioTipo = flujo === ESTATUS_FLUJO_POR_ENVIAR
    ? inferirEnvioTipoEstatus({ info: fila.entregable, detalles: notas }, fila, blob)
    : "";

  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(notas, [], historial, fila.link, subcliente, { flujo, importKey, envioTipo })
    : notas;

  return {
    marca: ESTATUS_INTERNO_MARCA,
    categoria: "Solicitud",
    subcliente,
    info: entregableLegibleEstatus(fila.entregable),
    personas: personasDesdeResponsableCsv(fila.responsable),
    detalles,
    link: fila.link || "",
    estado,
    flujo,
    importKey,
    envioTipo,
    idTarea: idImportacionEstatus(fila),
    deadline,
    fechaInicio,
    prioridad
  };
}

function tareaYaImportadaEstatus(existentes, fila) {
  const idImport = claveImportNormalizada(idImportacionEstatus(fila));
  const keyImport = claveImportNormalizada(claveImportacionEstatus(fila));
  return (existentes || []).some((t) => {
    if (!t) return false;
    // Clave canónica: importKey (estable y específica de la fila CSV).
    if (claveImportNormalizada(obtenerImportKeyTarea(t)) === keyImport) return true;
    // El IMP puede colisionar en casos raros; no bloquear por IMP solo.
    if (claveImportNormalizada(t.idTarea) === idImport) {
      return tareaCoincideFilaEstatus(t, fila);
    }
    return tareaCoincideFilaEstatus(t, fila);
  });
}

function prepararImportacionEstatus(filas, tareasExistentes, usuario) {
  const nuevas = [];
  const omitidasDuplicadas = [];
  const keysExistentes = new Set((tareasExistentes || []).map((t) => claveImportNormalizada(obtenerImportKeyTarea(t))).filter(Boolean));
  const keysNuevas = new Set();
  (filas || []).forEach((fila) => {
    if (!String(fila.entregable || "").trim()) return;
    const keyFila = claveImportNormalizada(claveImportacionEstatus(fila));
    const yaExistePorClave = keysExistentes.has(keyFila);
    const yaAgregadaEnLote = keysNuevas.has(keyFila);
    if (yaExistePorClave || yaAgregadaEnLote || tareaYaImportadaEstatus(tareasExistentes, fila)) {
      omitidasDuplicadas.push(fila);
      return;
    }
    const nueva = construirTareaDesdeFilaEstatus(fila, usuario);
    nuevas.push(nueva);
    if (keyFila) keysNuevas.add(keyFila);
  });
  return { nuevas, omitidasDuplicadas };
}

function esStatusCsvDisenar(statusRaw) {
  return claveEstatusInterno(statusRaw) === "disenar";
}

function listarTareasDisenarPendientesACorregir(tareas, filas) {
  const keys = new Set(
    (filas || [])
      .filter((f) => esStatusCsvDisenar(f.status))
      .map(claveImportacionEstatus)
  );
  if (!keys.size) return [];
  return (tareas || []).filter((t) => {
    if (!keys.has(obtenerImportKeyTarea(t))) return false;
    const estado = typeof cleanEstado === "function"
      ? cleanEstado(t.estado)
      : String(t.estado || "").toLowerCase();
    return estado === "pendiente";
  });
}

function textoEstatusLegible(valor) {
  const raw = String(valor || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const letters = raw.replace(/[^A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/g, "");
  const uppers = (raw.match(/[A-ZÁÉÍÓÚÜÑ]/g) || []).length;
  if (letters.length < 4 || uppers / letters.length < 0.55) return raw;

  return raw.toLowerCase().split(" ").map((word, i) => {
    const clean = word.replace(/[^a-záéíóúüñ0-9]/g, "");
    if (!clean) return word;
    if (ESTATUS_SIGLAS.has(clean)) {
      return word.replace(clean, clean.toUpperCase());
    }
    if (i > 0 && ESTATUS_PALABRAS_CORTAS.has(clean)) return word;
    const idx = word.indexOf(clean);
    if (idx < 0) return word.charAt(0).toUpperCase() + word.slice(1);
    return word.slice(0, idx) + clean.charAt(0).toUpperCase() + clean.slice(1) + word.slice(idx + clean.length);
  }).join(" ");
}

function textoEstatusEntregable(info, cadena) {
  const base = textoEstatusLegible(info);
  const cad = String(cadena || "").trim();
  if (!cad || !base) return base;
  const sufijo = ` (${cad})`;
  const sufijoLegible = ` (${textoEstatusLegible(cad)})`;
  if (base.toLowerCase().endsWith(sufijo.toLowerCase())) return base.slice(0, -sufijo.length).trim();
  if (base.toLowerCase().endsWith(sufijoLegible.toLowerCase())) return base.slice(0, -sufijoLegible.length).trim();
  return base;
}

function infoTareaUnicaParaSheet(tarea) {
  const info = String(tarea?.info || "").trim();
  if (!info) return info;
  const sub = typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(tarea) : String(tarea?.subcliente || "").trim();
  const key = typeof obtenerImportKeyTarea === "function" ? obtenerImportKeyTarea(tarea) : "";
  if (!sub || !key) return info;
  const sufijo = ` (${sub})`;
  if (info.toLowerCase().endsWith(sufijo.toLowerCase())) return info;
  return `${info}${sufijo}`;
}

function esTareaOcultaEnEstatus(tarea) {
  if (!tarea) return true;
  if (typeof esTareaCompletada === "function" && esTareaCompletada(tarea)) return true;
  if (typeof esTareaSuspendida === "function" && esTareaSuspendida(tarea)) return true;
  const estado = typeof cleanEstado === "function"
    ? cleanEstado(tarea.estado)
    : String(tarea?.estado || "").toLowerCase();
  return estado === "en pausa";
}

const ESTATUS_CARGA_DISENO = new Set(["pendiente", "en progreso", "seguimiento", "en revision"]);

function esTareaActivaCarga(tarea) {
  if (!tarea) return false;
  if (typeof esTareaOcultaEnEstatus === "function" && esTareaOcultaEnEstatus(tarea)) return false;
  const estado = typeof cleanEstado === "function"
    ? cleanEstado(tarea.estado)
    : String(tarea?.estado || "").toLowerCase();
  return ESTATUS_CARGA_DISENO.has(estado);
}

function esHandleDisenadorEstatus(handle, listaDisenadores) {
  const h = String(handle || "").replace(/^@/, "").trim().toLowerCase();
  if (!h) return false;
  const lista = [
    ...(Array.isArray(listaDisenadores) ? listaDisenadores : []),
    ...(typeof ROBIN_DESIGNER_USERNAMES !== "undefined" ? ROBIN_DESIGNER_USERNAMES : []),
    ...ESTATUS_DISENADORES_BASE
  ];
  return lista.some((d) => String(d || "").replace(/^@/, "").trim().toLowerCase() === h);
}

function nombreCortoDisenadorEstatus(handle) {
  const h = String(handle || "").replace(/^@/, "").trim().toLowerCase();
  const completo = typeof obtenerNombreDisplayEquipo === "function"
    ? obtenerNombreDisplayEquipo(h)
    : (typeof NOMBRES_DISPLAY_EQUIPO !== "undefined" ? NOMBRES_DISPLAY_EQUIPO[h] : "");
  if (completo && !/^@/.test(completo)) return String(completo).trim().split(/\s+/)[0];
  return h || "Persona";
}

function rolPersonaCargaEstatus(handle, listaDisenadores) {
  if (esHandleDisenadorEstatus(handle, listaDisenadores)) return "diseno";
  if (typeof esHandleContenidoEstatus === "function" && esHandleContenidoEstatus(handle)) return "contenido";
  return "ejecutivo";
}

function etiquetaRolCargaEstatus(rol) {
  if (rol === "contenido") return "Contenido";
  if (rol === "ejecutivo") return "Ejecutivo";
  return "Diseño";
}

function colorRolCargaEstatus(rol, idx) {
  const paletas = {
    diseno: ["#1B4332", "#2F7A4E", "#40916C"],
    contenido: ["#1D4E89", "#2563EB", "#3B82F6"],
    ejecutivo: ["#57534E", "#78716C", "#A8A29E"]
  };
  const lista = paletas[rol] || paletas.diseno;
  return lista[idx % lista.length];
}

function tareasDeDisenadorEstatus(tareas, handle) {
  const h = String(handle || "").replace(/^@/, "").trim().toLowerCase();
  return (tareas || []).filter((t) => {
    const responsables = typeof handlesResponsablesEstatus === "function"
      ? handlesResponsablesEstatus(t)
      : [];
    return responsables.includes(h);
  });
}

function contarCargaDisenador(tareas, handle) {
  const lista = tareasDeDisenadorEstatus(tareas, handle);
  const activas = lista.filter(esTareaActivaCarga);
  return {
    handle,
    total: lista.length,
    activas: activas.length,
    pausa: 0,
    completadas: lista.filter((t) => typeof esTareaCompletada === "function" && esTareaCompletada(t)).length,
    tareasActivas: activas.map((t) => ({
      tarea: t,
      cadena: typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(t) : (t.subcliente || ""),
      entregable: t.info || "Sin título"
    }))
  };
}

function resumenCargaAaronDavid(tareas, listaDisenadores) {
  return resumenCargaDisenadoresEstatus(tareas, listaDisenadores);
}

function resumenCargaDisenadoresEstatus(tareas, listaDisenadores) {
  const visibles = (tareas || []).filter((t) => !esTareaOcultaEnEstatus(t));
  const handles = new Set();
  visibles.forEach((t) => {
    const responsables = typeof handlesResponsablesEstatus === "function"
      ? handlesResponsablesEstatus(t)
      : (typeof obtenerHandlesDesdeCampoPersonas === "function"
        ? obtenerHandlesDesdeCampoPersonas(t.personas)
        : []);
    responsables.forEach((handle) => {
      const canon = String(handle || "").replace(/^@/, "").trim().toLowerCase();
      if (canon && canon !== "sin-asignar") handles.add(canon);
    });
  });

  const ordenRol = { diseno: 0, contenido: 1, ejecutivo: 2 };
  const items = Array.from(handles).map((handle) => {
    const conteo = contarCargaDisenador(visibles, handle);
    const rol = rolPersonaCargaEstatus(handle, listaDisenadores);
    return {
      ...conteo,
      rol,
      rolLabel: etiquetaRolCargaEstatus(rol),
      nombre: nombreCortoDisenadorEstatus(handle),
      nombreCompleto: typeof obtenerNombreDisplayEquipo === "function"
        ? obtenerNombreDisplayEquipo(handle)
        : nombreCortoDisenadorEstatus(handle)
    };
  }).filter((item) => item.activas > 0)
    .sort((a, b) => (ordenRol[a.rol] - ordenRol[b.rol]) || b.activas - a.activas || a.nombre.localeCompare(b.nombre, "es"))
    .map((item, idx, arr) => {
      const idxRol = arr.filter((x) => x.rol === item.rol).findIndex((x) => x.handle === item.handle);
      return { ...item, color: colorRolCargaEstatus(item.rol, idxRol < 0 ? idx : idxRol) };
    });

  const totalActivas = items.reduce((sum, item) => sum + item.activas, 0);
  const lideres = items.filter((item) => item.activas === Math.max(...items.map((i) => i.activas), 0) && item.activas > 0);
  return {
    items,
    totalActivas,
    maxActivas: Math.max(totalActivas, ...items.map((i) => i.activas), 1),
    lideres
  };
}

function itemOperativoEstatus(t, partes) {
  return {
    tarea: t,
    cadena: typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(t) : (t.subcliente || ""),
    entregable: t.info || "Sin título",
    comentario: partes.comentario || partes.notas,
    fecha: t.deadline || t.fechaInicio || ""
  };
}

function etapaOperativaEstatus(t, filasRef) {
  if (typeof esTareaOcultaEnEstatus === "function" && esTareaOcultaEnEstatus(t)) return "";
  const estado = estadoRobinEstatus(t);
  const parsed = typeof parseDetalles === "function" ? parseDetalles(t.detalles || "") : { notas: t.detalles || "" };
  const partes = notasYComentarioEstatus(parsed.notas);
  const fila = (filasRef || []).find((f) => tareaCoincideFilaEstatus(t, f));
  const flujo = obtenerFlujoTarea(t);
  const blob = [partes.comentario, partes.notas, fila && fila.comentarios, fila && fila.status].filter(Boolean).join("\n");
  if (estado === "seguimiento" || flujo === ESTATUS_FLUJO_ESPERA) return "cliente";
  if (estado === "pendiente" || estado === "en progreso") return "diseno";
  if (estado === "en pausa") return "";
  if (debeIrPorEnviarEstatus(t, filasRef, flujo, estado, blob, fila)) return "por-enviar";
  return "diseno";
}

function listasOperativasEstatus(tareas, filas) {
  const filasRef = filasEstatusReferencia(filas);
  const porEnviar = [];
  const esperaCliente = [];
  const faltaHacer = [];
  const vistosPorEnviar = new Set();
  const vistosEspera = new Set();
  const vistosFalta = new Set();

  const claveItemOperativo = (item) => {
    const t = item?.tarea || {};
    const idImp = claveImportNormalizada(t.idTarea);
    const cadenaBiz = typeof claveSubcliente === "function"
      ? claveSubcliente(item?.cadena || "")
      : String(item?.cadena || "").trim().toLowerCase();
    const tituloBiz = claveEstatusInterno(item?.entregable || t?.info || "");
    if (idImp.startsWith("imp-") && (cadenaBiz || tituloBiz)) {
      return `impbiz:${idImp}|${cadenaBiz}|${tituloBiz}`;
    }
    const keyImport = claveImportNormalizada(obtenerImportKeyTarea(t));
    if (keyImport) return `imp:${keyImport}`;
    if (typeof getTaskSelectionKey === "function") {
      const keyTask = claveImportNormalizada(getTaskSelectionKey(t));
      if (keyTask) return `task:${keyTask}`;
    }
    const cadena = cadenaBiz;
    const titulo = tituloBiz;
    const fecha = String(item?.fecha || t?.deadline || t?.fechaInicio || "").trim();
    return `fallback:${cadena}|${titulo}|${fecha}`;
  };

  const pushUnico = (lista, vistos, item) => {
    const k = claveItemOperativo(item);
    if (!k || vistos.has(k)) return;
    vistos.add(k);
    lista.push(item);
  };

  (tareas || []).forEach((t) => {
    const etapa = etapaOperativaEstatus(t, filasRef);
    if (!etapa) return;
    const parsed = typeof parseDetalles === "function" ? parseDetalles(t.detalles || "") : { notas: t.detalles || "" };
    const partes = notasYComentarioEstatus(parsed.notas);
    const item = itemOperativoEstatus(t, partes);
    if (etapa === "cliente") pushUnico(esperaCliente, vistosEspera, item);
    else if (etapa === "por-enviar") pushUnico(porEnviar, vistosPorEnviar, item);
    else pushUnico(faltaHacer, vistosFalta, item);
  });
  const byName = (a, b) => String(a.cadena).localeCompare(String(b.cadena), "es");
  return {
    porEnviar: porEnviar.sort(byName),
    esperaCliente: esperaCliente.sort(byName),
    faltaHacer: faltaHacer.sort(byName)
  };
}

function rangoSemanaLocalEstatus(fechaRef) {
  const d = fechaRef ? new Date(fechaRef) : new Date();
  const day = d.getDay();
  const diffLunes = day === 0 ? -6 : 1 - day;
  const lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffLunes);
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  return { inicio: lunes.getTime(), fin: domingo.getTime() };
}

function diasDesdeFechaEstatus(val) {
  if (typeof obtenerTiempoFecha !== "function") return null;
  const t = obtenerTiempoFecha(val);
  const hoy = typeof obtenerTiempoHoyLocal === "function" ? obtenerTiempoHoyLocal() : Date.now();
  if (t === Infinity) return null;
  return Math.floor((hoy - t) / 86400000);
}

function venceEstaSemanaEstatus(tarea, tHoy, finSemana) {
  if (!tarea) return false;
  if (typeof cuentaComoAtrasada === "function" && cuentaComoAtrasada(tarea, tHoy)) return false;
  const tDeadline = typeof obtenerTiempoFecha === "function" ? obtenerTiempoFecha(tarea.deadline) : Infinity;
  if (tDeadline === Infinity) return false;
  return tDeadline >= tHoy && tDeadline <= finSemana;
}

function timestampLineaHistorialEstatus(line) {
  const m = String(line || "").match(/\[(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})\]/);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const anioRaw = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  const anio = anioRaw < 100 ? 2000 + anioRaw : anioRaw;
  return new Date(anio, mes - 1, dia).getTime();
}

function cerradaEstaSemanaEstatus(tarea, inicio, fin) {
  if (typeof esTareaCompletada !== "function" || !esTareaCompletada(tarea)) return false;
  const parsed = typeof parseDetalles === "function"
    ? parseDetalles(tarea.detalles || "")
    : { historial: [] };
  const lineas = (parsed.historial || []).filter((l) => /completada/i.test(String(l)));
  for (let i = lineas.length - 1; i >= 0; i -= 1) {
    const ts = timestampLineaHistorialEstatus(lineas[i]);
    if (ts != null) return ts >= inicio && ts <= fin;
  }
  return false;
}

function etiquetaDiasSnapshotEstatus(tarea, modo) {
  if (!tarea) return "Sin fecha";
  const tHoy = typeof obtenerTiempoHoyLocal === "function" ? obtenerTiempoHoyLocal() : Date.now();
  if (modo === "listo") {
    const parsed = typeof parseDetalles === "function" ? parseDetalles(tarea.detalles || "") : { historial: [] };
    const lineas = (parsed.historial || []).filter((l) => /completada/i.test(String(l)));
    let ts = null;
    for (let i = lineas.length - 1; i >= 0; i -= 1) {
      ts = timestampLineaHistorialEstatus(lineas[i]);
      if (ts != null) break;
    }
    if (ts == null) return "Esta semana";
    const dias = Math.floor((tHoy - ts) / 86400000);
    if (dias <= 0) return "Hoy";
    return `hace ${dias}d`;
  }
  if (modo === "cliente") {
    const dias = diasDesdeFechaEstatus(tarea.deadline || tarea.fechaInicio);
    if (dias == null) return "Sin fecha";
    if (dias <= 0) return "Hoy";
    return `${dias}d`;
  }
  const tDeadline = typeof obtenerTiempoFecha === "function" ? obtenerTiempoFecha(tarea.deadline) : Infinity;
  if (tDeadline === Infinity) return "Sin fecha";
  const dias = Math.floor((tHoy - tDeadline) / 86400000);
  if (dias > 0) return `${dias}d atrasado`;
  if (dias === 0) return "Hoy";
  return `${Math.abs(dias)}d`;
}

function resumenPresentacionEstatus(tareas, filas) {
  const listas = listasOperativasEstatus(tareas, filas);
  const activas = (tareas || []).filter((t) => !esTareaOcultaEnEstatus(t));
  const tHoy = typeof obtenerTiempoHoyLocal === "function" ? obtenerTiempoHoyLocal() : Date.now();
  const semana = rangoSemanaLocalEstatus();
  const atrasadosItems = activas
    .filter((t) => typeof cuentaComoAtrasada === "function" && cuentaComoAtrasada(t, tHoy))
    .map((t) => itemOperativoEstatus(t, { notas: "", comentario: "" }));
  const vencenSemana = activas.filter((t) => venceEstaSemanaEstatus(t, tHoy, semana.fin)).length;
  const esperaLarga = listas.esperaCliente.filter((item) => {
    const dias = diasDesdeFechaEstatus(item.fecha || item.tarea?.deadline || item.tarea?.fechaInicio);
    return dias != null && dias >= 7;
  }).length;
  const listoItems = (tareas || [])
    .filter((t) => cerradaEstaSemanaEstatus(t, semana.inicio, semana.fin))
    .map((t) => itemOperativoEstatus(t, { notas: "", comentario: "" }));
  return {
    activos: activas.length,
    diseno: listas.faltaHacer.length,
    porEnviar: listas.porEnviar.length,
    cliente: listas.esperaCliente.length,
    atrasados: atrasadosItems.length,
    vencenSemana,
    esperaLarga,
    listo: listoItems.length,
    listas,
    atrasadosItems,
    listoItems
  };
}

function aplicarEnvioClienteEstatus(tarea, tipo, usuario) {
  const parsed = typeof parseDetalles === "function"
    ? parseDetalles(tarea.detalles || "")
    : { notas: tarea.detalles || "", subtareas: [], historial: [], link: tarea.link, subcliente: tarea.subcliente, importKey: tarea.importKey };
  const importKey = parsed.importKey || tarea.importKey || "";
  const sub = parsed.subcliente || (typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(tarea) : tarea.subcliente);
  const hoy = new Date();
  const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, "0")}`;
  const autor = String(usuario || "").replace(/^@/, "");
  const historial = [...(parsed.historial || [])];
  const esPropuesta = tipo === "propuesta";
  const flujo = esPropuesta ? ESTATUS_FLUJO_ESPERA : "";
  const estado = esPropuesta ? "Seguimiento" : "Completada";
  historial.push(`• [${timestamp}] Envió ${esPropuesta ? "propuesta" : "arte final"} al cliente por @${autor}`);
  historial.push(`• [${timestamp}] Estado cambiado a "${estado}" por @${autor}`);
  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(parsed.notas, parsed.subtareas || [], historial, parsed.link || tarea.link, sub, { flujo, importKey })
    : `${tarea.detalles || ""}\n${historial[historial.length - 2]}\n${historial[historial.length - 1]}`;
  return {
    ...tarea,
    estado,
    flujo,
    importKey,
    detalles
  };
}

function listarTareasEstatusNormalizarImport(tareas, filas) {
  const resultado = [];
  (tareas || []).forEach((t) => {
    const importKey = obtenerImportKeyTarea(t);
    const esImport = Boolean(importKey) || String(t.idTarea || "").startsWith("IMP-");
    if (!esImport) return;
    const fila = (filas || []).find((f) => tareaCoincideFilaEstatus(t, f));
    const infoObjetivo = fila
      ? entregableLegibleEstatus(fila.entregable)
      : entregableLegibleEstatus(t.info);
    const infoActual = String(t.info || "").trim();
    const needsInfo = infoObjetivo && infoObjetivo !== infoActual;
    const prioridadActual = typeof normalizarPrioridad === "function"
      ? normalizarPrioridad(t.prioridad)
      : String(t.prioridad || "");
    const needsPrioridad = prioridadActual === "Alta";
    if (!needsInfo && !needsPrioridad) return;
    resultado.push({
      tarea: t,
      fila,
      flujoCsv: "",
      estadoCsv: "",
      infoNuevo: needsInfo ? infoObjetivo : "",
      prioridadNueva: needsPrioridad ? "Media" : "",
      importKey: importKey || (fila ? claveImportacionEstatus(fila) : "")
    });
  });
  return resultado;
}

function listarTareasEstatusARealinear(tareas, filas) {
  const resultado = [];
  const hayExhibidor = (tareas || []).some((t) => {
    const cadena = typeof obtenerSubclienteTarea === "function"
      ? obtenerSubclienteTarea(t)
      : String(t.subcliente || "").trim();
    return esTituloExhibidorBroxol(t.info, cadena);
  });
  const filaExhibidor = (filas || []).find((f) => esTituloExhibidorBroxol(f.entregable, f.cadena));

  (tareas || []).forEach((t) => {
    const cadena = typeof obtenerSubclienteTarea === "function"
      ? obtenerSubclienteTarea(t)
      : String(t.subcliente || "").trim();
    const fila = (filas || []).find((f) => tareaCoincideFilaEstatus(t, f));
    const completada = typeof esTareaCompletada === "function" && esTareaCompletada(t);
    const blobTarea = claveEstatusInterno(`${t.detalles || ""} ${t.fechaInicio || ""}`);
    const pareceExhibidorOriginal = blobTarea.includes("enviado af")
      || String(t.fechaInicio || "").includes("14/07/2026");
    const needsRestaurarExhibidor = !hayExhibidor
      && esTituloRistraBroxol(t.info, cadena)
      && (completada || pareceExhibidorOriginal);
    if (!fila && !needsRestaurarExhibidor) return;

    const filaUso = needsRestaurarExhibidor ? (filaExhibidor || fila) : fila;
    const flujoCsv = filaUso ? flujoDesdeStatusCsv(filaUso.status) : "";
    const estadoCsv = filaUso ? mapearEstadoDesdeCsv(filaUso.status) : "";
    const flujoActual = obtenerFlujoTarea(t);
    const estadoActual = estadoRobinEstatus(t);
    const estadoObjetivo = typeof cleanEstado === "function"
      ? cleanEstado(estadoCsv)
      : String(estadoCsv || "").toLowerCase();
    const usuarioCompleto = usuarioMarcoEstadoEstatus(t, "Completada") || yaEnvioArteFinalEstatus(t);
    const usuarioMovio = usuarioMarcoEstadoEstatus(t, "Seguimiento")
      || usuarioMarcoEstadoEstatus(t, "En progreso")
      || usuarioMarcoEstadoEstatus(t, "Pendiente")
      || usuarioMarcoEstadoEstatus(t, "En pausa")
      || usuarioMarcoEstadoEstatus(t, "En revisión")
      || usuarioCompleto;

    const needsCerrarExhibidor = (esTituloExhibidorBroxol(t.info, cadena) || needsRestaurarExhibidor)
      && estadoActual === "en revisión"
      && !usuarioMarcoEstadoEstatus(t, "En progreso")
      && !usuarioMarcoEstadoEstatus(t, "Pendiente")
      && !usuarioMarcoEstadoEstatus(t, "Seguimiento");
    const needsFlujo = Boolean(flujoCsv)
      && !flujoActual
      && estadoActual === "en revisión"
      && !usuarioMovio
      && !needsCerrarExhibidor
      && !needsRestaurarExhibidor;
    const needsEstadoPorEnviar = flujoCsv === ESTATUS_FLUJO_POR_ENVIAR
      && estadoActual === "completada"
      && estadoObjetivo === "en revisión"
      && !usuarioCompleto
      && !esTituloExhibidorBroxol(t.info, cadena)
      && !needsRestaurarExhibidor;
    if (!needsFlujo && !needsEstadoPorEnviar && !needsRestaurarExhibidor && !needsCerrarExhibidor) return;
    resultado.push({
      tarea: t,
      fila: filaUso,
      flujoCsv: (needsRestaurarExhibidor || needsCerrarExhibidor) ? "" : (needsFlujo || needsEstadoPorEnviar ? flujoCsv : flujoActual),
      estadoCsv: needsCerrarExhibidor ? "Completada" : (needsEstadoPorEnviar ? estadoCsv : ""),
      infoNuevo: needsRestaurarExhibidor ? "Exhibidor Broxol" : "",
      importKey: filaUso ? claveImportacionEstatus(filaUso) : (t.importKey || "")
    });
  });
  return resultado;
}

function handlesPersonaParaEstatus(tarea) {
  if (typeof handlesResponsablesEstatus === "function") {
    return handlesResponsablesEstatus(tarea).filter((h) => h && h !== "sin-asignar");
  }
  const raw = typeof obtenerHandlesDesdeCampoPersonas === "function"
    ? obtenerHandlesDesdeCampoPersonas(tarea?.personas || "")
    : [];
  return raw.map((h) => String(h || "").replace(/^@/, "").trim().toLowerCase()).filter(Boolean);
}

function agruparTareasPorPersonaEstatus(tareas) {
  const grupos = new Map();
  (tareas || []).forEach((t) => {
    const asignados = handlesPersonaParaEstatus(t);
    const destinos = asignados.length ? asignados : [""];
    destinos.forEach((handleRaw) => {
      const handle = String(handleRaw || "").replace(/^@/, "").trim().toLowerCase();
      const key = handle || "sin-asignar";
      if (!grupos.has(key)) {
        grupos.set(key, {
          handle,
          nombre: handle
            ? (typeof obtenerNombreDisplayEquipo === "function"
              ? obtenerNombreDisplayEquipo(handle)
              : nombreCortoDisenadorEstatus(handle))
            : "Sin asignar",
          tareas: []
        });
      }
      grupos.get(key).tareas.push(t);
    });
  });

  return Array.from(grupos.values())
    .map((grupo) => {
      const subMap = new Map();
      (grupo.tareas || []).forEach((t) => {
        const cadena = typeof obtenerSubclienteTarea === "function"
          ? obtenerSubclienteTarea(t)
          : (t.subcliente || "Sin cadena");
        const subKey = String(cadena || "Sin cadena").trim().toLowerCase();
        if (!subMap.has(subKey)) {
          subMap.set(subKey, {
            nombre: String(cadena || "Sin cadena").trim() || "Sin cadena",
            tareas: []
          });
        }
        subMap.get(subKey).tareas.push(t);
      });
      const subgrupos = Array.from(subMap.values())
        .map((sub) => ({
          ...sub,
          tareas: typeof ordenarTareasPorModo === "function"
            ? ordenarTareasPorModo(sub.tareas, "estado")
            : sub.tareas
        }))
        .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
      return {
        ...grupo,
        subgrupos,
        tareas: typeof ordenarTareasPorModo === "function"
          ? ordenarTareasPorModo(grupo.tareas, "estado")
          : grupo.tareas
      };
    })
    .sort((a, b) => {
      if (!a.handle) return 1;
      if (!b.handle) return -1;
      return String(a.nombre).localeCompare(String(b.nombre), "es");
    });
}

function aplicarComentarioEstatus(tarea, comentario, usuario) {
  const parsed = typeof parseDetalles === "function"
    ? parseDetalles(tarea.detalles || "")
    : {
      notas: tarea.detalles || "",
      subtareas: [],
      historial: [],
      link: tarea.link,
      subcliente: tarea.subcliente,
      importKey: tarea.importKey,
      flujo: tarea.flujo
    };
  const partes = notasYComentarioEstatus(parsed.notas);
  const notasNuevas = construirNotasEstatus(partes.notas, comentario);
  const importKey = parsed.importKey || tarea.importKey || "";
  const sub = parsed.subcliente || (typeof obtenerSubclienteTarea === "function"
    ? obtenerSubclienteTarea(tarea)
    : tarea.subcliente);
  const flujo = parsed.flujo || tarea.flujo || "";
  const historial = [...(parsed.historial || [])];
  if (usuario && String(comentario || "").trim()) {
    const hoy = new Date();
    const timestamp = `${hoy.getDate()}/${hoy.getMonth() + 1} ${hoy.getHours()}:${String(hoy.getMinutes()).padStart(2, "0")}`;
    historial.push(`• [${timestamp}] Comentario de cliente registrado por @${String(usuario).replace(/^@/, "")}`);
  }
  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(
      notasNuevas,
      parsed.subtareas || [],
      historial,
      parsed.link || tarea.link,
      sub,
      { flujo, importKey }
    )
    : notasNuevas;
  return {
    ...tarea,
    detalles,
    importKey,
    flujo
  };
}

function agruparTareasPorSubclienteEstatus(tareas, marca) {
  const map = new Map();
  (tareas || []).forEach((t) => {
    if (!t) return;
    if (marca && typeof marcasCoinciden === "function" && !marcasCoinciden(t.marca, marca)) return;
    const cadena = typeof obtenerSubclienteTarea === "function"
      ? obtenerSubclienteTarea(t)
      : String(t.subcliente || "").trim();
    const nombre = String(cadena || "").trim() || "Sin cadena";
    const key = nombre === "Sin cadena"
      ? "__sin_cadena__"
      : (typeof claveSubcliente === "function" ? claveSubcliente(nombre) : nombre.toLowerCase());
    if (!map.has(key)) map.set(key, { nombre, tareas: [] });
    map.get(key).tareas.push(t);
  });

  return Array.from(map.values())
    .map((grupo) => ({
      ...grupo,
      tareas: typeof ordenarTareasPorModo === "function"
        ? ordenarTareasPorModo(grupo.tareas, "estado")
        : grupo.tareas
    }))
    .sort((a, b) => {
      if (a.nombre === "Sin cadena") return 1;
      if (b.nombre === "Sin cadena") return -1;
      return String(a.nombre).localeCompare(String(b.nombre), "es");
    });
}

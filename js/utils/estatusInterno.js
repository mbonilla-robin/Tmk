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
  if (clave.includes("miguel")) agregar("@mbonilla");

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

function idImportacionEstatus(fila) {
  const key = claveImportacionEstatus(fila);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  const cadena = claveEstatusInterno(fila.cadena).replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `IMP-${Math.abs(hash).toString(36)}${cadena ? `-${cadena}` : ""}`;
}

function tituloEstatusParaMatch(info, cadena) {
  const limpio = typeof textoEstatusEntregable === "function"
    ? textoEstatusEntregable(info, cadena)
    : String(info || "");
  return claveEstatusInterno(limpio);
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

function titulosEstatusEquivalentes(infoTarea, entregableFila, cadena) {
  const a = tituloEstatusParaMatch(infoTarea, cadena);
  const b = tituloEstatusParaMatch(entregableFila, cadena);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(`${b} (`) || b.startsWith(`${a} (`)) return true;
  if (esTituloRistraBroxol(infoTarea, cadena) && esTituloRistraBroxol(entregableFila, cadena)) return true;
  if (esTituloExhibidorBroxol(infoTarea, cadena) && esTituloExhibidorBroxol(entregableFila, cadena)) return true;
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
  if (estado === "en revisión") return ESTATUS_FLUJO_POR_ENVIAR;
  return "";
}

function aplicarFlujoSegunEstadoEstatus(tarea, estadoNuevo) {
  if (!tarea) return tarea;
  const estado = estadoNuevo != null ? estadoNuevo : tarea.estado;
  const flujo = flujoDesdeEstadoRobin(estado);
  const parsed = typeof parseDetalles === "function"
    ? parseDetalles(tarea.detalles || "")
    : { notas: tarea.detalles || "", subtareas: [], historial: [], link: tarea.link, subcliente: tarea.subcliente, importKey: tarea.importKey };
  const importKey = parsed.importKey || tarea.importKey || "";
  const sub = parsed.subcliente || (typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(tarea) : tarea.subcliente);
  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(parsed.notas, parsed.subtareas || [], parsed.historial || [], parsed.link || tarea.link, sub, { flujo, importKey })
    : tarea.detalles;
  return { ...tarea, estado, flujo, importKey, detalles };
}

function textoIndicaPorEnviar(texto) {
  const clave = claveEstatusInterno(texto);
  if (!clave || clave.includes("ok por enviar")) return false;
  return clave.includes("por enviar a cliente") || /^por enviar(\s|\||$)/.test(clave);
}

function filasEstatusReferencia(filas) {
  if (filas && filas.length) return filas;
  return typeof ESTATUS_LA_SANTE_IMPORT_ROWS !== "undefined" ? ESTATUS_LA_SANTE_IMPORT_ROWS : [];
}

function notasYComentarioEstatus(notasRaw) {
  const texto = String(notasRaw || "").trim();
  if (!texto) return { notas: "", comentario: "" };
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

  const detalles = typeof serializeDetalles === "function"
    ? serializeDetalles(notas, [], historial, fila.link, subcliente, { flujo, importKey })
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
    idTarea: idImportacionEstatus(fila),
    deadline,
    fechaInicio,
    prioridad
  };
}

function tareaYaImportadaEstatus(existentes, fila) {
  return (existentes || []).some((t) => tareaCoincideFilaEstatus(t, fila));
}

function prepararImportacionEstatus(filas, tareasExistentes, usuario) {
  const nuevas = [];
  const omitidasDuplicadas = [];
  (filas || []).forEach((fila) => {
    if (!String(fila.entregable || "").trim()) return;
    if (tareaYaImportadaEstatus(tareasExistentes, fila)) {
      omitidasDuplicadas.push(fila);
      return;
    }
    nuevas.push(construirTareaDesdeFilaEstatus(fila, usuario));
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

const ESTATUS_CARGA_DISENO = new Set(["pendiente", "en progreso", "seguimiento", "en revision"]);

function esTareaActivaCarga(tarea) {
  if (!tarea) return false;
  if (typeof esTareaCompletada === "function" && esTareaCompletada(tarea)) return false;
  if (typeof esTareaSuspendida === "function" && esTareaSuspendida(tarea)) return false;
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
  return h || "Diseñador";
}

function tareasDeDisenadorEstatus(tareas, handle) {
  const h = String(handle || "").replace(/^@/, "").trim().toLowerCase();
  return (tareas || []).filter((t) => {
    const handles = typeof obtenerHandlesDesdeCampoPersonas === "function"
      ? obtenerHandlesDesdeCampoPersonas(t.personas || "")
      : [];
    return handles.includes(h);
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
  const visibles = (tareas || []).filter((t) => {
    if (typeof esTareaCompletada === "function" && esTareaCompletada(t)) return false;
    if (typeof esTareaSuspendida === "function" && esTareaSuspendida(t)) return false;
    return true;
  });
  const handles = new Set();
  visibles.forEach((t) => {
    const tokens = typeof obtenerHandlesDesdeCampoPersonas === "function"
      ? obtenerHandlesDesdeCampoPersonas(t.personas)
      : (typeof tokenizarCampoPersonas === "function" ? tokenizarCampoPersonas(t.personas) : []);
    tokens.forEach((token) => {
      const canon = String(token || "").replace(/^@/, "").trim().toLowerCase();
      if (canon && esHandleDisenadorEstatus(canon, listaDisenadores)) handles.add(canon);
    });
  });

  const items = Array.from(handles).map((handle) => {
    const conteo = contarCargaDisenador(visibles, handle);
    return {
      ...conteo,
      nombre: nombreCortoDisenadorEstatus(handle),
      nombreCompleto: typeof obtenerNombreDisplayEquipo === "function"
        ? obtenerNombreDisplayEquipo(handle)
        : nombreCortoDisenadorEstatus(handle)
    };
  }).filter((item) => item.activas > 0)
    .sort((a, b) => b.activas - a.activas || a.nombre.localeCompare(b.nombre, "es"))
    .map((item, idx) => ({ ...item, color: ESTATUS_CARGA_COLORES[idx % ESTATUS_CARGA_COLORES.length] }));

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

function listasOperativasEstatus(tareas, filas) {
  const filasRef = filasEstatusReferencia(filas);
  const porEnviar = [];
  const esperaCliente = [];
  (tareas || []).forEach((t) => {
    const completada = typeof esTareaCompletada === "function" && esTareaCompletada(t);
    const suspendida = typeof esTareaSuspendida === "function" && esTareaSuspendida(t);
    if (completada || suspendida) return;
    const estado = estadoRobinEstatus(t);
    const parsed = typeof parseDetalles === "function" ? parseDetalles(t.detalles || "") : { notas: t.detalles || "" };
    const partes = notasYComentarioEstatus(parsed.notas);
    const fila = filasRef.find((f) => tareaCoincideFilaEstatus(t, f));
    const flujo = obtenerFlujoTarea(t);
    const blob = [partes.comentario, partes.notas, fila && fila.comentarios, fila && fila.status].filter(Boolean).join("\n");
    const item = itemOperativoEstatus(t, partes);
    if (estado === "seguimiento" || flujo === ESTATUS_FLUJO_ESPERA) {
      esperaCliente.push(item);
      return;
    }
    if (estado === "en progreso" || estado === "pendiente" || estado === "en pausa") return;
    const csvPorEnviar = fila && flujoDesdeStatusCsv(fila.status) === ESTATUS_FLUJO_POR_ENVIAR;
    if (flujo === ESTATUS_FLUJO_POR_ENVIAR || csvPorEnviar || textoIndicaPorEnviar(blob)) {
      porEnviar.push(item);
    }
  });
  const byName = (a, b) => String(a.cadena).localeCompare(String(b.cadena), "es");
  return {
    porEnviar: porEnviar.sort(byName),
    esperaCliente: esperaCliente.sort(byName)
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

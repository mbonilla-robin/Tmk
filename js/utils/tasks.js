function cleanIdTarea(id) {
  if (!id) return "";
  const idStr = String(id).trim();
  if (idStr.includes("GMT") || (idStr.includes("2026") && idStr.length > 15) || idStr.includes("Venezuela") || idStr.startsWith("STB-")) {
    return "";
  }
  return idStr;
}

function generateBrandId(marca) {
  const prefix = String(marca || "TSK").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `STB-${prefix}-${rand}`;
}

function generarIdDeterminista(t) {
  const contentSeed = `${t.marca || "GEN"}-${t.info || ""}`;
  let hash = 0;
  for (let i = 0; i < contentSeed.length; i++) {
    hash = ((hash << 5) - hash) + contentSeed.charCodeAt(i);
    hash |= 0;
  }
  const prefix = String(t.marca || "TSK").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  return `STB-${prefix}-${Math.abs(hash) % 100000}`;
}

function idTareaParaApi(tarea) {
  const raw = String(tarea?.idTarea || "").trim();
  if (!raw || raw.startsWith("STB-")) return "";
  if (!isValidIdTarea(raw)) return "";
  return raw;
}

function infoTareaCoincide(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function tituloLimpioTarea(t) {
  return extraerTituloLimpio(t?.info, t?.categoria).toLowerCase().trim();
}

function deadlineClaveTarea(t) {
  return normalizarDeadline(t?.deadline) || String(t?.deadline || "").trim();
}

function tareasMismaEntidad(a, b) {
  return sonLaMismaTarea(a, b, { estricto: true });
}

function sonLaMismaTarea(a, b, opciones = {}) {
  const estricto = opciones.estricto !== false;
  if (!a || !b) return false;

  const idA = String(a.idTarea || "").trim();
  const idB = String(b.idTarea || "").trim();
  if (idA && idB && idA === idB) return true;

  const cleanA = cleanIdTarea(idA);
  const cleanB = cleanIdTarea(idB);
  if (cleanA && cleanB && cleanA === cleanB) return true;

  if (!marcasCoinciden(a.marca, b.marca)) return false;

  const tituloA = tituloLimpioTarea(a);
  const tituloB = tituloLimpioTarea(b);
  if (tituloA && tituloB && tituloA === tituloB) return true;

  if (infoTareaCoincide(a.info, b.info)) return true;

  if (estricto) {
    return getTaskSelectionKey(a) === getTaskSelectionKey(b);
  }

  return false;
}

function extraerFechaCreacionDesdeDetalles(detalles, deadlineRef) {
  const texto = String(detalles || "");
  const match = texto.match(/\[(\d{1,2})\/(\d{1,2})\s+\d{1,2}:\d{2}\]\s+Creado por/i);
  if (!match) return "";

  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  let anio = new Date().getFullYear();
  const refDeadline = parsearFechaLibre(deadlineRef);
  if (refDeadline) anio = refDeadline.anio;

  return normalizarDeadline(formatearFechaDisplay(`${dia}/${mes}/${anio}`));
}

function resolverFechaInicioTarea(t) {
  const explicita = normalizarDeadline(t?.fechaInicio || "");
  const candidata = explicita || extraerFechaCreacionDesdeDetalles(t?.detalles, t?.deadline);
  if (!candidata) return "";

  const tIni = obtenerTiempoFecha(candidata);
  const tDead = obtenerTiempoFecha(t?.deadline);
  if (tIni === Infinity) return "";
  if (tDead !== Infinity && tIni > tDead) return candidata;
  return candidata;
}

function crearNuevaTareaVacia() {
  return {
    marca: "La Santé",
    categoria: "",
    info: "",
    personas: "",
    detalles: "",
    link: "",
    estado: "Pendiente",
    deadline: "",
    fechaInicio: fechaHoyDisplay(),
    prioridad: "Media"
  };
}

function encontrarIndiceTarea(lista, ref) {
  if (!ref || !lista || !lista.length) return -1;
  return lista.findIndex((t) => tareasMismaEntidad(t, ref));
}

function getTaskSelectionKey(t) {
  const id = cleanIdTarea(t.idTarea);
  if (id && isValidIdTarea(id)) return id;
  const rawId = String(t.idTarea || "").trim();
  if (rawId.startsWith("STB-")) return rawId;
  const titulo = tituloLimpioTarea(t) || String(t.info || "").trim().toLowerCase();
  return `${t.marca || ""}|${titulo}`.toLowerCase().trim();
}

const TASK_KEY_URL_PARAMS = ["task", "task_key", "tarea"];

function leerTaskKeyDesdeUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    for (let i = 0; i < TASK_KEY_URL_PARAMS.length; i += 1) {
      const valor = String(params.get(TASK_KEY_URL_PARAMS[i]) || "").trim();
      if (valor) return valor;
    }
  } catch (e) {
    /* ignore */
  }
  return "";
}

function limpiarTaskKeyEnUrl() {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    TASK_KEY_URL_PARAMS.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (!changed) return;
    const query = url.searchParams.toString();
    const nextUrl = query
      ? `${url.pathname}?${query}${url.hash}`
      : `${url.pathname}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);
  } catch (e) {
    /* ignore */
  }
}

function resolverTareaActual(tareas, tareaRef) {
  if (!tareaRef) return null;
  const lista = tareas || [];
  const indice = encontrarIndiceTarea(lista, tareaRef);
  if (indice >= 0) return lista[indice];
  return tareaRef;
}

const DIAS_ANTICIPACION_TRABAJO = {
  alta: 5,
  media: 3,
  baja: 1
};

function obtenerDiasAnticipacionTrabajo(prioridad) {
  const p = normalizarPrioridad(prioridad);
  if (p === "Alta") return DIAS_ANTICIPACION_TRABAJO.alta;
  if (p === "Baja") return DIAS_ANTICIPACION_TRABAJO.baja;
  return DIAS_ANTICIPACION_TRABAJO.media;
}

function obtenerTiempoHoyLocal(fechaRef) {
  const hoy = fechaRef || new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
}

function obtenerTiempoInicioTrabajo(tarea) {
  const tDeadline = obtenerTiempoFecha(tarea.deadline);
  if (tDeadline === Infinity) return Infinity;

  const diasAnt = obtenerDiasAnticipacionTrabajo(tarea.prioridad);
  const tCalculado = restarDiasHabiles(tDeadline, diasAnt);

  const fechaInicioExplicita = normalizarDeadline(tarea?.fechaInicio || "");
  if (fechaInicioExplicita) {
    const tManual = obtenerTiempoFecha(fechaInicioExplicita);
    if (tManual !== Infinity && tManual > tCalculado) return tManual;
  }

  return tCalculado;
}

function esTareaCompletada(tarea) {
  return cleanEstado(tarea?.estado) === "completada";
}

function esEntregaHoyTarea(tarea, tHoy) {
  if (esTareaCompletada(tarea)) return false;
  const tDeadline = obtenerTiempoFecha(tarea.deadline);
  const hoy = tHoy ?? obtenerTiempoHoyLocal();
  return tDeadline !== Infinity && tDeadline === hoy;
}

function esTrabajarHoyTarea(tarea, tHoy) {
  if (esTareaCompletada(tarea)) return false;
  const hoy = tHoy ?? obtenerTiempoHoyLocal();
  const tDeadline = obtenerTiempoFecha(tarea.deadline);
  if (tDeadline === Infinity || tDeadline <= hoy) return false;

  const tInicio = obtenerTiempoInicioTrabajo(tarea);
  if (tInicio === Infinity) return false;

  return hoy >= tInicio && hoy < tDeadline;
}

function esRelevanteHoyTarea(tarea, tHoy) {
  return esEntregaHoyTarea(tarea, tHoy) || esTrabajarHoyTarea(tarea, tHoy);
}

function ordenarTareasParaHoy(lista) {
  return [...(lista || [])].sort((a, b) => {
    const pesoA = getPriorityWeight(a.prioridad);
    const pesoB = getPriorityWeight(b.prioridad);
    if (pesoA !== pesoB) return pesoB - pesoA;
    const fechaA = obtenerTiempoFecha(a.deadline);
    const fechaB = obtenerTiempoFecha(b.deadline);
    if (fechaA !== fechaB) return fechaA - fechaB;
    return (a.info || "").localeCompare(b.info || "", "es");
  });
}

function aplicarFechasLocales(tarea) {
  if (!tarea?._localFechas) return tarea;
  const pin = tarea._localFechas;
  return {
    ...tarea,
    ...(pin.deadline ? { deadline: pin.deadline } : {}),
    ...(pin.fechaInicio ? { fechaInicio: pin.fechaInicio } : {})
  };
}

function registrarEdicionFechasLocales(tarea, campos = {}) {
  const pin = { ...(tarea?._localFechas || {}) };
  let touched = false;

  if (campos.deadline !== undefined) {
    const norm = normalizarDeadline(campos.deadline);
    if (norm) {
      pin.deadline = norm;
      touched = true;
    }
  }
  if (campos.fechaInicio !== undefined) {
    const norm = normalizarDeadline(campos.fechaInicio);
    if (norm) {
      pin.fechaInicio = norm;
      touched = true;
    }
  }
  if (!touched) return tarea;

  pin.updatedAt = Date.now();
  return aplicarFechasLocales({ ...tarea, _localFechas: pin });
}

function tareaTieneFechasLocalesPendientes(tarea) {
  return !!(tarea?._localFechas?.deadline || tarea?._localFechas?.fechaInicio);
}

function fechasLocalesConfirmadasConRemota(local, remota) {
  if (!local?._localFechas) {
    const dlLocal = normalizarDeadline(local?.deadline);
    const dlRemota = normalizarDeadline(remota?.deadline);
    if (dlLocal && !dlRemota) return false;
    if (dlLocal && dlRemota && dlLocal !== dlRemota) return false;
    const fiLocal = normalizarDeadline(local?.fechaInicio || "");
    const fiRemota = normalizarDeadline(remota?.fechaInicio || "");
    if (fiLocal && fiRemota && fiLocal !== fiRemota) return false;
    return true;
  }

  const pin = local._localFechas;
  if (pin.deadline && normalizarDeadline(remota?.deadline) !== pin.deadline) return false;
  if (pin.fechaInicio && normalizarDeadline(remota?.fechaInicio) !== pin.fechaInicio) return false;
  return true;
}

function limpiarFechasLocalesSiConfirmadas(tarea, remota) {
  if (!tarea?._localFechas || !fechasLocalesConfirmadasConRemota(tarea, remota)) return tarea;
  const copia = { ...tarea };
  delete copia._localFechas;
  return copia;
}

function normalizarTareaCampos(t) {
  return aplicarFechasLocales({
    ...t,
    marca: normalizarMarca(t.marca),
    estado: normalizarEstado(t.estado),
    prioridad: normalizarPrioridad(t.prioridad || t.Prioridad),
    deadline: normalizarDeadline(t.deadline),
    fechaInicio: resolverFechaInicioTarea(t),
    personas: normalizarCampoPersonas(t.personas)
  });
}

function normalizarValorCampoTarea(campo, valor) {
  if (campo === "prioridad") return normalizarPrioridad(valor);
  if (campo === "estado") return normalizarEstado(valor);
  if (campo === "deadline") return normalizarDeadline(valor);
  if (campo === "fechaInicio") return normalizarDeadline(valor);
  return valor;
}

const ORDEN_ESTADOS_LISTA = {
  "pendiente": 1,
  "en progreso": 2,
  "seguimiento": 3,
  "en revision": 4,
  "en pausa": 5,
  "completada": 6
};

function obtenerOrdenEstadoTarea(tarea) {
  return ORDEN_ESTADOS_LISTA[cleanEstado(tarea.estado)] || 50;
}

function ordenarTareasPorModo(tareas, modoAgrupacion) {
  const lista = [...(tareas || [])];

  if (modoAgrupacion === "fecha") {
    return lista.sort((a, b) => {
      const fechaA = obtenerTiempoFecha(a.deadline);
      const fechaB = obtenerTiempoFecha(b.deadline);
      const aSin = fechaA === Infinity;
      const bSin = fechaB === Infinity;
      if (aSin && !bSin) return 1;
      if (!aSin && bSin) return -1;
      if (fechaA !== fechaB) return fechaA - fechaB;
      const pesoA = getPriorityWeight(a.prioridad);
      const pesoB = getPriorityWeight(b.prioridad);
      if (pesoA !== pesoB) return pesoB - pesoA;
      return (a.info || "").localeCompare(b.info || "", "es");
    });
  }

  return lista.sort((a, b) => {
    const ordA = obtenerOrdenEstadoTarea(a);
    const ordB = obtenerOrdenEstadoTarea(b);
    if (ordA !== ordB) return ordA - ordB;
    const pesoA = getPriorityWeight(a.prioridad);
    const pesoB = getPriorityWeight(b.prioridad);
    if (pesoA !== pesoB) return pesoB - pesoA;
    const fechaA = obtenerTiempoFecha(a.deadline);
    const fechaB = obtenerTiempoFecha(b.deadline);
    if (fechaA !== fechaB) return fechaA - fechaB;
    return (a.info || "").localeCompare(b.info || "", "es");
  });
}

function agruparTareasPorMarcaOrdenadas(tareas, modoAgrupacion) {
  const agrupamiento = {};
  (tareas || []).forEach(t => {
    const marcaKey = formatearMarca(t.marca) || "Otros";
    if (!agrupamiento[marcaKey]) agrupamiento[marcaKey] = [];
    agrupamiento[marcaKey].push(t);
  });

  Object.keys(agrupamiento).forEach(marca => {
    agrupamiento[marca] = ordenarTareasPorModo(agrupamiento[marca], modoAgrupacion);
  });

  return agrupamiento;
}

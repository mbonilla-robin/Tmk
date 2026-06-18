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
  const contentSeed = `${t.marca || "GEN"}-${t.info || ""}-${t.deadline || ""}`;
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
  if (!a || !b) return false;

  const idA = String(a.idTarea || "").trim();
  const idB = String(b.idTarea || "").trim();
  if (idA && idB && idA === idB) return true;

  const cleanA = cleanIdTarea(idA);
  const cleanB = cleanIdTarea(idB);
  if (cleanA && cleanB && cleanA === cleanB) return true;

  if (!marcasCoinciden(a.marca, b.marca)) return false;

  const deadlineA = deadlineClaveTarea(a);
  const deadlineB = deadlineClaveTarea(b);
  if (deadlineA && deadlineB && deadlineA !== deadlineB) return false;

  const tituloA = tituloLimpioTarea(a);
  const tituloB = tituloLimpioTarea(b);
  if (tituloA && tituloB && tituloA === tituloB) return true;

  if (infoTareaCoincide(a.info, b.info)) return true;

  return getTaskSelectionKey(a) === getTaskSelectionKey(b);
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
  const deadlineNorm = deadlineClaveTarea(t);
  const titulo = tituloLimpioTarea(t) || String(t.info || "").trim().toLowerCase();
  return `${t.marca || ""}|${titulo}|${deadlineNorm}`.toLowerCase().trim();
}

function resolverTareaActual(tareas, tareaRef) {
  if (!tareaRef) return null;
  const lista = tareas || [];
  const indice = encontrarIndiceTarea(lista, tareaRef);
  if (indice >= 0) return lista[indice];
  return tareaRef;
}

function normalizarTareaCampos(t) {
  return {
    ...t,
    marca: normalizarMarca(t.marca),
    estado: normalizarEstado(t.estado),
    prioridad: normalizarPrioridad(t.prioridad || t.Prioridad),
    deadline: normalizarDeadline(t.deadline),
    personas: normalizarCampoPersonas(t.personas)
  };
}

function normalizarValorCampoTarea(campo, valor) {
  if (campo === "prioridad") return normalizarPrioridad(valor);
  if (campo === "estado") return normalizarEstado(valor);
  if (campo === "deadline") return normalizarDeadline(valor);
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

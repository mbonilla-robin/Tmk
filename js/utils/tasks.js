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

function getTaskSelectionKey(t) {
  const id = cleanIdTarea(t.idTarea);
  if (id && isValidIdTarea(id)) return id;
  return `${t.marca || ""}|${t.info || ""}|${t.deadline || ""}`.toLowerCase().trim();
}

function resolverTareaActual(tareas, tareaRef) {
  if (!tareaRef) return null;
  const key = getTaskSelectionKey(tareaRef);
  const found = (tareas || []).find(t => getTaskSelectionKey(t) === key);
  if (found) return found;
  const porId = tareaRef.idTarea
    ? (tareas || []).find(t => t.idTarea && t.idTarea === tareaRef.idTarea)
    : null;
  return porId || tareaRef;
}

function normalizarTareaCampos(t) {
  return {
    ...t,
    estado: normalizarEstado(t.estado),
    prioridad: normalizarPrioridad(t.prioridad || t.Prioridad),
    deadline: normalizarDeadline(t.deadline)
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

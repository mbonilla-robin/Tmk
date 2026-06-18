const MESES_ESTATUS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

function formatearFechaEstatus(fechaStr) {
  const parsed = parsearFechaLibre(fechaStr);
  if (!parsed) return "Sin fecha";
  const anioActual = new Date().getFullYear();
  const mes = MESES_ESTATUS[parsed.mes - 1];
  if (parsed.anio !== anioActual) {
    return `${parsed.dia} de ${mes} de ${parsed.anio}`;
  }
  return `${parsed.dia} de ${mes}`;
}

function tareaTienePersona(tarea, personasFiltro) {
  if (!personasFiltro || personasFiltro.length === 0) return true;
  return personasFiltro.some((filtro) => tareaIncluyePersonaFiltro(tarea.personas || "", filtro));
}

function filtrarTareasParaEstatus(tareas, { marcas, estados, filtroTiempo, personas }) {
  const hoy = new Date();
  const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

  return (tareas || []).filter(t => {
    if (!marcas || marcas.length === 0) return false;
    const marcaMatch = marcas.some(m => marcasCoinciden(t.marca, m));
    if (!marcaMatch) return false;

    if (estados && estados.length > 0) {
      const estadoNorm = cleanEstado(t.estado);
      const estadoMatch = estados.some(e => cleanEstado(e) === estadoNorm);
      if (!estadoMatch) return false;
    }

    const tDeadline = obtenerTiempoFecha(t.deadline);
    const esCompletada = cleanEstado(t.estado) === "completada";

    if (filtroTiempo === "hoy") {
      if (!esRelevanteHoyTarea(t, tHoy)) return false;
    } else if (filtroTiempo === "atrasadas") {
      const esAtrasada = tDeadline !== Infinity && tDeadline < tHoy;
      if (!esAtrasada || esCompletada) return false;
    }

    if (!tareaTienePersona(t, personas)) return false;

    return true;
  });
}

function ordenarTareasEstatus(tareas, estadosOrden, ordenarPor) {
  const lista = [...tareas];

  if (ordenarPor === "deadline") {
    return lista.sort((a, b) => {
      const fechaA = obtenerTiempoFecha(a.deadline);
      const fechaB = obtenerTiempoFecha(b.deadline);
      const aSin = fechaA === Infinity;
      const bSin = fechaB === Infinity;
      if (aSin && !bSin) return 1;
      if (!aSin && bSin) return -1;
      if (fechaA !== fechaB) return fechaA - fechaB;
      return obtenerOrdenEstadoTarea(a) - obtenerOrdenEstadoTarea(b);
    });
  }

  const ordenEstados = estadosOrden && estadosOrden.length > 0
    ? estadosOrden
    : LISTA_ESTADOS_VALIDOS;

  const indiceEstado = (t) => {
    const idx = ordenEstados.findIndex(e => cleanEstado(e) === cleanEstado(t.estado));
    return idx >= 0 ? idx : 99;
  };

  return lista.sort((a, b) => {
    const ordA = indiceEstado(a);
    const ordB = indiceEstado(b);
    if (ordA !== ordB) return ordA - ordB;
    const fechaA = obtenerTiempoFecha(a.deadline);
    const fechaB = obtenerTiempoFecha(b.deadline);
    if (fechaA !== fechaB) return fechaA - fechaB;
    return (a.info || "").localeCompare(b.info || "", "es");
  });
}

function formatearLineaSubtareaEstatus(texto, completed) {
  const textoLimpio = String(texto || "").trim();
  if (!textoLimpio) return null;
  const sufijo = completed ? " (✓)" : "";
  return `> ${textoLimpio}${sufijo}`;
}

function formatearLineaTareaEstatus(tarea) {
  const estado = normalizarEstado(tarea.estado) || "Sin estado";
  const titulo = (tarea.info || "Sin título").trim();
  const deadline = formatearFechaEstatus(tarea.deadline);
  const personas = (tarea.personas || "Sin asignar").trim();

  const lineas = [`• _${estado}_ | *${titulo}* | ${deadline} | ${personas}`];

  const { subtareas } = parseDetalles(tarea.detalles);
  const lineasSubtareas = subtareas
    .map(sub => formatearLineaSubtareaEstatus(sub.text, sub.completed))
    .filter(Boolean);

  if (lineasSubtareas.length > 0) {
    lineas.push(lineasSubtareas.join("\n\n"));
  }

  return lineas.join("\n");
}

function generarTextoEstatus(tareas, { marcas, estados, filtroTiempo, ordenarPor, personas }) {
  if (!marcas || marcas.length === 0) return "";

  const filtradas = filtrarTareasParaEstatus(tareas, { marcas, estados, filtroTiempo, personas });
  const bloques = [];

  marcas.forEach(marca => {
    const tareasMarca = filtradas.filter(t => marcasCoinciden(t.marca, marca));
    if (tareasMarca.length === 0) return;

    const ordenadas = ordenarTareasEstatus(tareasMarca, estados, ordenarPor);
    const lineasTareas = ordenadas.map(formatearLineaTareaEstatus);
    bloques.push(`*${formatearMarca(marca)}:*\n\n${lineasTareas.join("\n\n")}`);
  });

  return bloques.join("\n\n\n");
}

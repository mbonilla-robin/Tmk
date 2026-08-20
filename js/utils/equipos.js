const NOMBRES_DISPLAY_EQUIPO = {
  mbonilla: "Miguel Bonilla",
  ralvarez: "Ricardo Álvarez",
  dsalavarria: "Daniela Salavarría",
  fcolmenares: "Francisco Colmenares",
  gnebrus: "Genesis Nebrus",
  sgiucastro: "Sofia Giucastro",
  dsanchez: "Douglas Sánchez",
  agraterol: "Aaron Graterol",
  dmatheus: "David Matheus",
  jalfiero: "Jesús Alfiero",
  arusso: "Alejandro Russo",
  arodriguez: "Angelo Rodríguez",
  cmujica: "Carlos Mujica"
};

const ESTADOS_BARRA_EQUIPO = [
  { key: "en progreso", label: "En progreso", color: "bg-blue-500" },
  { key: "espera de comentarios", label: "Espera de comentarios", color: "bg-amber-500" },
  { key: "pendiente", label: "Pendiente", color: "bg-zinc-400" },
  { key: "en revision", label: "En revisión", color: "bg-purple-500" },
  { key: "en pausa", label: "En pausa", color: "bg-red-400" }
];

function esPersonaExcluidaEquipos(valor) {
  const clave = normalizarClavePersona(valor);
  return clave === "trade" || clave === "cliente" || clave === "admin";
}

function esTareaPresenciaEquipos(tarea) {
  if (typeof esFilaPresencia === "function") return esFilaPresencia(tarea);
  const id = String(tarea?.idTarea || tarea?.id || "").trim().toUpperCase();
  return id.startsWith("PRESENCE-");
}

function filtrarTareasRealesEquipos(tareas) {
  return (tareas || []).filter((t) => !esTareaPresenciaEquipos(t));
}

function expandirTokenPersonaEquipos(token) {
  if (esPersonaExcluidaEquipos(token)) return [];

  const canonico = resolverHandleCanonico(token);
  if (canonico) return [canonico];

  const clave = normalizarClavePersona(token);
  return clave ? [clave] : [];
}

function obtenerPersonasTaggeadasEnTareas(tareas) {
  const handles = new Set();

  filtrarTareasRealesEquipos(tareas).forEach((tarea) => {
    tokenizarCampoPersonas(tarea.personas).forEach((token) => {
      expandirTokenPersonaEquipos(token).forEach((handle) => handles.add(handle));
    });
  });

  return Array.from(handles);
}

function normalizarHandleRosterEquipos(valor) {
  const clave = normalizarClavePersona(valor);
  if (!clave || esPersonaExcluidaEquipos(clave)) return "";
  return resolverHandleCanonico(clave) || clave;
}

/**
 * Roster completo del equipo: ejecutivos + contenido + diseñadores + quien ya tenga tareas.
 * Siempre incluye a todos del equipo, con o sin carga.
 */
function obtenerRosterEquipos(listaEjecutivos, listaContenido, listaDisenadores, tareas) {
  const handles = new Set();

  (listaEjecutivos || []).forEach((u) => {
    const handle = normalizarHandleRosterEquipos(u);
    if (handle) handles.add(handle);
  });

  (listaContenido || []).forEach((u) => {
    const handle = normalizarHandleRosterEquipos(u);
    if (handle) handles.add(handle);
  });

  (listaDisenadores || []).forEach((u) => {
    const handle = normalizarHandleRosterEquipos(u);
    if (handle) handles.add(handle);
  });

  obtenerPersonasTaggeadasEnTareas(tareas).forEach((handle) => {
    if (handle && !esPersonaExcluidaEquipos(handle)) handles.add(handle);
  });

  return Array.from(handles);
}

function obtenerNombreDisplayEquipo(handle) {
  const clave = normalizarClavePersona(handle);
  if (typeof loadUserDataLocal === "function" && typeof migrarNombreCompletoAPerfil === "function") {
    const prefs = migrarNombreCompletoAPerfil(loadUserDataLocal(clave));
    const nombre = construirNombreCompletoPerfil(prefs.perfilNombre, prefs.perfilApellido) || prefs.nombreCompleto;
    if (nombre) return nombre;
  }
  if (NOMBRES_DISPLAY_EQUIPO[clave]) return NOMBRES_DISPLAY_EQUIPO[clave];
  return formatearHandleCanonico(clave);
}

function obtenerRangoSemana(fechaRef) {
  return obtenerRangoSemanaLaboral(fechaRef);
}

/** Completadas: solo para el desglose por periodo (Hoy / Semana / Todo). */
function tareaCompletadaEnRangoEquipos(tarea, modo, tHoy, semanaInicio, semanaFin) {
  if (!esTareaCompletada(tarea)) return false;
  const td = obtenerTiempoFecha(tarea.deadline);

  if (modo === "todo") return true;
  if (modo === "hoy") return td !== Infinity && td === tHoy;
  if (modo === "semana") return td !== Infinity && td >= semanaInicio && td <= semanaFin;
  return false;
}

/**
 * Carga activa: TODAS las tareas abiertas asignadas (no completada / no suspendida / no presencia).
 * El filtro Hoy/Semana no esconde tareas activas reales — solo afecta completadas.
 */
function esTareaActivaEquipos(tarea) {
  if (esTareaPresenciaEquipos(tarea)) return false;
  if (esTareaCompletada(tarea) || esTareaSuspendida(tarea)) return false;
  return true;
}

function calcularIndiceCarga(activas, atrasadas) {
  let indice = activas;
  if (atrasadas >= 3) indice += 3;
  else if (atrasadas >= 1) indice += atrasadas;
  return indice;
}

function obtenerNivelCarga(indice) {
  if (indice <= 4) {
    return { id: "baja", label: "Baja", color: "text-emerald-700", bar: "bg-emerald-500" };
  }
  if (indice <= 9) {
    return { id: "media", label: "Media", color: "text-amber-700", bar: "bg-amber-500" };
  }
  return { id: "alta", label: "Alta", color: "text-red-700", bar: "bg-red-500" };
}

function estaUsuarioEnLinea(handle, usuariosEnLinea) {
  const clave = normalizarClavePersona(handle);
  if (!clave) return false;
  return (usuariosEnLinea || []).some((u) => {
    const username = String(u.username || "").replace(/^@/, "").toLowerCase();
    return username === clave;
  });
}

function agregarMetricasPorPersona(tareas, modo, rosterHandles) {
  const tareasReales = filtrarTareasRealesEquipos(tareas);
  const handles = (Array.isArray(rosterHandles) && rosterHandles.length)
    ? rosterHandles
    : obtenerPersonasTaggeadasEnTareas(tareasReales);
  const tHoy = obtenerTiempoHoyLocal();
  const { inicio, fin } = obtenerRangoSemana();

  const resultado = handles.map((handle) => {
    const filtroPersona = formatearHandleCanonico(handle);
    const tareasPersona = tareasReales.filter((t) =>
      tareaIncluyePersonaFiltro(t.personas || "", filtroPersona)
    );

    const abiertas = tareasPersona.filter(esTareaActivaEquipos);

    const porEstado = {};
    LISTA_ESTADOS_VALIDOS.forEach((e) => {
      porEstado[cleanEstado(e)] = 0;
    });

    abiertas.forEach((t) => {
      const est = typeof normalizarEstado === "function"
        ? cleanEstado(normalizarEstado(t.estado))
        : cleanEstado(t.estado);
      const key = est === "seguimiento" ? "espera de comentarios" : est;
      porEstado[key] = (porEstado[key] || 0) + 1;
    });

    const activas = abiertas.length;
    const completadasPeriodo = tareasPersona.filter((t) =>
      tareaCompletadaEnRangoEquipos(t, modo, tHoy, inicio, fin)
    ).length;

    let atrasadas = 0;
    let vencenHoy = 0;
    abiertas.forEach((t) => {
      const td = obtenerTiempoFecha(t.deadline);
      if (td !== Infinity && td < tHoy) atrasadas += 1;
      if (td === tHoy) vencenHoy += 1;
    });

    const indiceCarga = calcularIndiceCarga(activas, atrasadas);

    return {
      handle,
      display: obtenerNombreDisplayEquipo(handle),
      handleFiltro: formatearHandleCanonico(handle),
      activas,
      completadasPeriodo,
      atrasadas,
      vencenHoy,
      porEstado,
      indiceCarga,
      nivelCarga: obtenerNivelCarga(indiceCarga),
      totalEnRango: activas + completadasPeriodo
    };
  }).sort((a, b) =>
    b.activas - a.activas ||
    b.indiceCarga - a.indiceCarga ||
    a.display.localeCompare(b.display, "es")
  );

  const maxActivas = Math.max(...resultado.map((r) => r.activas), 1);

  return resultado.map((r) => ({
    ...r,
    nivelCarga: {
      ...r.nivelCarga,
      pct: r.activas === 0 ? 6 : Math.max(10, Math.round((r.activas / maxActivas) * 100))
    }
  }));
}

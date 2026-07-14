const NOMBRES_DISPLAY_EQUIPO = {
  mbonilla: "Miguel Bonilla",
  ralvarez: "Ricardo Álvarez",
  dsalavarria: "Daniela Salavarría",
  fcolmenares: "Francisco Colmenares",
  gnebrus: "Genesis Nebrus",
  sgiucastro: "Sofia Giucastro",
  agraterol: "Aaron Graterol",
  dmatheus: "David Matheus",
  jalfiero: "Jesús Alfiero",
  arusso: "Alejandro Russo",
  arodriguez: "Angelo Rodríguez",
  cmujica: "Carlos Mujica"
};

const ESTADOS_BARRA_EQUIPO = [
  { key: "en progreso", label: "En progreso", color: "bg-blue-500" },
  { key: "seguimiento", label: "Seguimiento", color: "bg-amber-500" },
  { key: "pendiente", label: "Pendiente", color: "bg-zinc-400" },
  { key: "en revision", label: "En revisión", color: "bg-purple-500" },
  { key: "en pausa", label: "En pausa", color: "bg-red-400" }
];

function esPersonaExcluidaEquipos(valor) {
  const clave = normalizarClavePersona(valor);
  return clave === "trade" || clave === "cliente";
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

function tareaCuentaParaRangoEquipos(tarea, modo, tHoy, semanaInicio, semanaFin) {
  if (esTareaPresenciaEquipos(tarea)) return false;

  const est = cleanEstado(tarea.estado);
  const td = obtenerTiempoFecha(tarea.deadline);
  const esCompletada = est === "completada";
  const esSuspendida = est === "suspendido";

  if (modo === "todo") return !esSuspendida;

  if (modo === "hoy") {
    if (esSuspendida) return false;
    if (!esCompletada) {
      if (est === "en progreso") return true;
      if (typeof cuentaComoAtrasada === "function" && cuentaComoAtrasada(tarea, tHoy)) return true;
      return esRelevanteHoyTarea(tarea, tHoy);
    }
    return td !== Infinity && td === tHoy;
  }

  if (modo === "semana") {
    if (esSuspendida) return false;
    if (!esCompletada) {
      if (est === "en progreso") return true;
      if (typeof cuentaComoAtrasada === "function" && cuentaComoAtrasada(tarea, tHoy)) return true;
      if (td !== Infinity && td >= semanaInicio && td <= semanaFin) return true;
      return esRelevanteHoyTarea(tarea, tHoy);
    }
    return td !== Infinity && td >= semanaInicio && td <= semanaFin;
  }

  return false;
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

function agregarMetricasPorPersona(tareas, modo) {
  const tareasReales = filtrarTareasRealesEquipos(tareas);
  const handles = obtenerPersonasTaggeadasEnTareas(tareasReales);
  const tHoy = obtenerTiempoHoyLocal();
  const { inicio, fin } = obtenerRangoSemana();

  const resultado = handles.map((handle) => {
    const filtroPersona = formatearHandleCanonico(handle);
    const tareasPersona = tareasReales.filter((t) =>
      tareaIncluyePersonaFiltro(t.personas || "", filtroPersona)
    );

    const enRango = tareasPersona.filter((t) =>
      tareaCuentaParaRangoEquipos(t, modo, tHoy, inicio, fin)
    );

    const porEstado = {};
    LISTA_ESTADOS_VALIDOS.forEach((e) => {
      porEstado[cleanEstado(e)] = 0;
    });

    let activas = 0;
    let completadasPeriodo = 0;

    enRango.forEach((t) => {
      const est = cleanEstado(t.estado);
      porEstado[est] = (porEstado[est] || 0) + 1;
      if (est === "completada") completadasPeriodo += 1;
      else if (est !== "suspendido") activas += 1;
    });

    let atrasadas = 0;
    let vencenHoy = 0;
    tareasPersona.forEach((t) => {
      if (esTareaCompletada(t) || esTareaSuspendida(t)) return;
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
      totalEnRango: enRango.length
    };
  }).filter((r) =>
    r.activas > 0 || r.completadasPeriodo > 0 || r.atrasadas > 0 || r.vencenHoy > 0
  ).sort((a, b) =>
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

const MESES_ESTATUS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const ORGANIZAR_ESTATUS_OPCIONES = [
  { id: "persona", label: "Por personas" },
  { id: "marca", label: "Por marca" },
  { id: "subcliente", label: "Por subcliente" },
  { id: "espera-comentarios", label: "Espera de comentarios" }
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

function fechaEstatusHoy() {
  const hoy = typeof fechaHoyDisplay === "function" ? fechaHoyDisplay() : "";
  return formatearFechaEstatus(hoy || `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`);
}

function tituloMarcasEstatus(marcas) {
  const nombres = (marcas || []).map((m) => (typeof formatearMarca === "function" ? formatearMarca(m) : m)).filter(Boolean);
  if (!nombres.length) return "las marcas";
  if (nombres.length === 1) return `*${nombres[0]}*`;
  if (nombres.length === 2) return `*${nombres[0]}* y *${nombres[1]}*`;
  return `*${nombres.slice(0, -1).join("*, *")}* y *${nombres[nombres.length - 1]}*`;
}

function encabezadoEstatus(marcas) {
  return [
    "¡Hola, team!",
    `Por aquí les dejo el estatus de ${tituloMarcasEstatus(marcas)}`,
    fechaEstatusHoy()
  ].join("\n");
}

function tareaTienePersona(tarea, personasFiltro) {
  if (!personasFiltro || personasFiltro.length === 0) return true;
  return personasFiltro.some((filtro) => tareaIncluyePersonaFiltro(tarea.personas || "", filtro));
}

function filtrarTareasParaEstatus(tareas, { marcas, estados, filtroTiempo, personas, subclientes }) {
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
      // Espera de comentarios: no incluir las que ya entraron a cola COR.
      const soloSeguimiento = estados.every((e) => cleanEstado(e) === "seguimiento");
      if (soloSeguimiento && typeof tareaPendienteSubirCor === "function" && tareaPendienteSubirCor(t)) {
        return false;
      }
    }

    const esSuspendida = esTareaSuspendida(t);

    if (filtroTiempo === "hoy") {
      if (esSuspendida || !esRelevanteHoyTarea(t, tHoy)) return false;
    } else if (filtroTiempo === "atrasadas") {
      if (!cuentaComoAtrasada(t, tHoy)) return false;
    }

    if (!tareaTienePersona(t, personas)) return false;

    if (subclientes && subclientes.length > 0) {
      const sub = obtenerSubclienteTarea(t);
      if (!subclientes.some((s) => subclientesCoinciden(s, sub))) return false;
    }

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

function formatearLineaTareaEstatusCompacta(tarea) {
  const estado = normalizarEstado(tarea.estado) || "Sin estado";
  const titulo = (tarea.info || "Sin título").trim();
  const link = typeof obtenerLinkTarea === "function" ? obtenerLinkTarea(tarea) : "";
  return `- ${titulo} | _${estado}_ | ${link || "—"}`;
}

function agruparTareasEstatusPorMarca(tareas, marcas) {
  return (marcas || [])
    .map((marca) => ({
      titulo: typeof formatearMarca === "function" ? formatearMarca(marca) : marca,
      tareas: (tareas || []).filter((t) => marcasCoinciden(t.marca, marca))
    }))
    .filter((grupo) => grupo.tareas.length > 0);
}

function agruparTareasEstatusPorSubcliente(tareas) {
  const map = new Map();
  (tareas || []).forEach((t) => {
    const sub = obtenerSubclienteTarea(t) || "Sin subcliente";
    const key = typeof claveSubcliente === "function" ? claveSubcliente(sub) : sub.toLowerCase();
    if (!map.has(key)) map.set(key, { titulo: sub, tareas: [] });
    map.get(key).tareas.push(t);
  });
  return Array.from(map.values()).sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
}

function claveHandleEstatus(handle) {
  if (typeof normalizarClavePersona === "function") {
    return normalizarClavePersona(handle) || "sin-asignar";
  }
  return String(handle || "").replace(/^@/, "").trim().toLowerCase() || "sin-asignar";
}

function esHandleEspecialEstatus(handle) {
  const key = claveHandleEstatus(handle);
  return key === "sin-asignar" || key === "trade" || key === "cliente" || key === "admin";
}

function esHandleDisenadorEstatus(handle) {
  const key = claveHandleEstatus(handle);
  if (esHandleEspecialEstatus(key)) return false;
  if (typeof esPersonaDisenador === "function") return esPersonaDisenador(key);
  if (typeof obtenerHandlesDisenadores === "function") {
    return obtenerHandlesDisenadores().includes(key);
  }
  return false;
}

function esHandleContenidoEstatus(handle) {
  const key = claveHandleEstatus(handle);
  if (esHandleEspecialEstatus(key) || esHandleDisenadorEstatus(key)) return false;
  if (typeof esPersonaContenido === "function") return esPersonaContenido(key);
  if (typeof obtenerHandlesContenido === "function") {
    return obtenerHandlesContenido().includes(key);
  }
  return false;
}

function handlesResponsablesEstatus(tarea) {
  const handles = typeof obtenerHandlesDesdeCampoPersonas === "function"
    ? obtenerHandlesDesdeCampoPersonas(tarea?.personas || "")
    : [];
  if (!handles.length) return ["sin-asignar"];

  const disenadores = [];
  const contenido = [];
  const ejecutivos = [];

  handles.forEach((handle) => {
    const key = claveHandleEstatus(handle);
    if (esHandleEspecialEstatus(key)) return;
    if (esHandleDisenadorEstatus(key)) {
      if (!disenadores.includes(key)) disenadores.push(key);
      return;
    }
    if (esHandleContenidoEstatus(key)) {
      if (!contenido.includes(key)) contenido.push(key);
      return;
    }
    if (!ejecutivos.includes(key)) ejecutivos.push(key);
  });

  if (disenadores.length) return disenadores;
  if (contenido.length) return contenido;
  if (ejecutivos.length) return ejecutivos;
  return ["sin-asignar"];
}

function tituloPersonaEstatus(handle) {
  const key = claveHandleEstatus(handle);
  if (key === "sin-asignar") return "Sin asignar";
  const nombre = typeof obtenerNombreDisplayEquipo === "function"
    ? obtenerNombreDisplayEquipo(key)
    : (typeof formatearHandleCanonico === "function" ? formatearHandleCanonico(key) : key);
  if (!nombre) return `@${key}`;
  return nombre.startsWith("@") ? nombre : `@${nombre}`;
}

function agruparTareasEstatusPorPersona(tareas) {
  const map = new Map();
  (tareas || []).forEach((t) => {
    handlesResponsablesEstatus(t).forEach((handle) => {
      const key = claveHandleEstatus(handle);
      if (!map.has(key)) {
        map.set(key, { key, titulo: tituloPersonaEstatus(key), subgrupos: new Map() });
      }
      const sub = obtenerSubclienteTarea(t) || "Sin subcliente";
      const subKey = typeof claveSubcliente === "function" ? claveSubcliente(sub) : sub.toLowerCase();
      const personaGrupo = map.get(key);
      if (!personaGrupo.subgrupos.has(subKey)) {
        personaGrupo.subgrupos.set(subKey, { titulo: sub, tareas: [] });
      }
      personaGrupo.subgrupos.get(subKey).tareas.push(t);
    });
  });
  return Array.from(map.values())
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"))
    .map((persona) => ({
      key: persona.key,
      titulo: persona.titulo,
      subgrupos: Array.from(persona.subgrupos.values())
        .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"))
    }));
}

function ordenarGruposPersonasEstatus(grupos, personasFiltro) {
  if (!personasFiltro || personasFiltro.length === 0) return grupos;
  const orden = new Map();
  personasFiltro.forEach((p, i) => {
    const clave = typeof normalizarClavePersona === "function"
      ? normalizarClavePersona(p)
      : String(p || "").replace(/^@/, "").trim().toLowerCase();
    if (clave && !orden.has(clave)) orden.set(clave, i);
  });
  return [...grupos].sort((a, b) => {
    const ia = orden.has(a.key) ? orden.get(a.key) : 999;
    const ib = orden.has(b.key) ? orden.get(b.key) : 999;
    if (ia !== ib) return ia - ib;
    return a.titulo.localeCompare(b.titulo, "es");
  });
}

function generarCuerpoEstatusPorPersona(tareas, { estados, ordenarPor, personasFiltro }) {
  const personas = ordenarGruposPersonasEstatus(
    agruparTareasEstatusPorPersona(tareas),
    personasFiltro
  );
  if (!personas.length) return "";

  return personas.map((persona) => {
    const bloquesSub = persona.subgrupos.map((sub) => {
      const ordenadas = ordenarTareasEstatus(sub.tareas, estados, ordenarPor);
      const lineas = ordenadas.map(formatearLineaTareaEstatusCompacta);
      return `*${sub.titulo}*\n${lineas.join("\n")}`;
    }).join("\n\n");
    return `*${persona.titulo}*\n${bloquesSub}`;
  }).join("\n\n");
}

function agruparTareasEstatus(tareas, { organizarPor, marcas }) {
  if (organizarPor === "persona") return agruparTareasEstatusPorPersona(tareas);
  if (organizarPor === "subcliente") return agruparTareasEstatusPorSubcliente(tareas);
  return agruparTareasEstatusPorMarca(tareas, marcas);
}

function saludoEsperaComentariosEstatus(fecha = new Date()) {
  const hora = fecha instanceof Date ? fecha.getHours() : new Date().getHours();
  const momento = hora < 12 ? "Feliz día" : (hora < 19 ? "Feliz tarde" : "Feliz noche");
  return `¡Hola, equipo! ${momento}.`;
}

function encabezadoEsperaComentariosEstatus() {
  return [
    saludoEsperaComentariosEstatus(),
    "",
    "Por esta vía, le compartimos una lista detallada de lo que estamos *esperando por comentarios* para poder realizar _ajustes_ o enviar _arte finales_. Quedamos atentos, muchísimas gracias."
  ].join("\n");
}

function generarCuerpoEstatusEsperaComentarios(tareas) {
  const grupos = agruparTareasEstatusPorSubcliente(tareas);
  if (!grupos.length) return "";

  return grupos.map((grupo) => {
    const n = (grupo.tareas || []).length;
    const etiqueta = n === 1 ? "1 entregable" : `${n} entregables`;
    return `- Espera de comentarios: *${grupo.titulo}* (${etiqueta})`;
  }).join("\n");
}

function generarCuerpoEstatus(tareas, { marcas, estados, ordenarPor, organizarPor, personasFiltro }) {
  if (organizarPor === "espera-comentarios") {
    return generarCuerpoEstatusEsperaComentarios(tareas);
  }

  if (organizarPor === "persona") {
    return generarCuerpoEstatusPorPersona(tareas, { estados, ordenarPor, personasFiltro });
  }

  const grupos = agruparTareasEstatus(tareas, { organizarPor, marcas });
  if (!grupos.length) return "";

  return grupos.map((grupo) => {
    const ordenadas = ordenarTareasEstatus(grupo.tareas, estados, ordenarPor);
    const lineas = ordenadas.map(formatearLineaTareaEstatusCompacta);
    return `*${grupo.titulo}*\n${lineas.join("\n")}`;
  }).join("\n\n");
}

function generarTextoEstatus(tareas, { marcas, estados, filtroTiempo, ordenarPor, personas, subclientes, organizarPor }) {
  if (!marcas || marcas.length === 0) return "";

  const modo = organizarPor || "persona";
  const estadosFiltro = modo === "espera-comentarios"
    ? ["Seguimiento"]
    : estados;

  const filtradas = filtrarTareasParaEstatus(tareas, {
    marcas,
    estados: estadosFiltro,
    filtroTiempo,
    personas,
    subclientes
  });
  if (!filtradas.length) return "";

  const cuerpo = generarCuerpoEstatus(filtradas, {
    marcas,
    estados: estadosFiltro,
    ordenarPor: ordenarPor || "estado",
    organizarPor: modo,
    personasFiltro: personas
  });

  if (!cuerpo) return "";

  if (modo === "espera-comentarios") {
    return `${encabezadoEsperaComentariosEstatus()}\n\n${cuerpo}`;
  }

  return `${encabezadoEstatus(marcas)}\n\n${cuerpo}`;
}

function obtenerMarcasUnicasTareas(tareas) {
  const marcas = [];
  (tareas || []).forEach((t) => {
    const marca = t?.marca;
    if (!marca) return;
    if (!marcas.some((m) => marcasCoinciden(m, marca))) marcas.push(marca);
  });
  return marcas;
}

function generarTextoEstatusDesdeSeleccion(tareas, { ordenarPor, organizarPor } = {}) {
  const lista = (tareas || []).filter((t) => t && (t.info || t.marca));
  if (lista.length === 0) return "";

  const marcas = obtenerMarcasUnicasTareas(lista);
  const cuerpo = generarCuerpoEstatus(lista, {
    marcas,
    estados: LISTA_ESTADOS_VALIDOS,
    ordenarPor: ordenarPor || "estado",
    organizarPor: organizarPor || "persona"
  });

  if (!cuerpo) return "";
  return `${encabezadoEstatus(marcas)}\n\n${cuerpo}`;
}

window.ORGANIZAR_ESTATUS_OPCIONES = ORGANIZAR_ESTATUS_OPCIONES;

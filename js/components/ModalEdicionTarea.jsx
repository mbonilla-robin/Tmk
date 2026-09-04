function PropertyRow({ icon, label, children }) {
  return (
    <div className="task-prop-row group flex items-center min-h-[34px] py-0.5 px-1 -mx-1 rounded hover:bg-zinc-50/80 transition-colors">
      <div className="task-prop-label flex items-center gap-2 w-[128px] shrink-0 text-ui-sm text-zinc-500">
        <i className={`${icon} w-3.5 text-center text-zinc-400 text-[11px]`} />
        <span>{label}</span>
      </div>
      <div className="task-prop-value flex-1 min-w-0">{children}</div>
    </div>
  );
}

function parseDetallesSeguro(raw) {
  try {
    if (typeof parseDetalles === "function") {
      const parsed = parseDetalles(raw || "") || {};
      return {
        notes: parsed.notes || parsed.notas || "",
        notas: parsed.notas || parsed.notes || "",
        subtareas: Array.isArray(parsed.subtareas) ? parsed.subtareas : [],
        historial: Array.isArray(parsed.historial) ? parsed.historial : [],
        link: parsed.link || "",
        subcliente: parsed.subcliente || "",
        flujo: parsed.flujo || "",
        importKey: parsed.importKey || "",
        envioTipo: parsed.envioTipo || "",
        pendienteCor: Boolean(parsed.pendienteCor),
        medidas: parsed.medidas || null
      };
    }
  } catch (err) {
    console.warn("ROBIN: no se pudieron leer los detalles del entregable", err);
  }
  return { notes: "", notas: "", subtareas: [], historial: [], link: "", subcliente: "", flujo: "", importKey: "", envioTipo: "", pendienteCor: false, medidas: null };
}

function ModalEdicionTarea({ tarea: tareaProp, onClose, onSave, onDelete, listaPersonas, registrarNuevaPersona, listaCategorias, registrarNuevaCategoria, listaSubclientes, registrarNuevoSubcliente, onEliminarSubcliente, marcasDisponibles, usuario, nombreUsuario, onComentarioPublicado, onToast, soloLectura = false, modoDisenador = false, tareas = [], relacionesTareas = [], onRelacionCreada, onAbrirTareaRelacionada, onDuplicarSubcliente, getMarcaStyle, onAbrirMarca, onAbrirMacro }) {
  const tarea = tareaProp && typeof tareaProp === "object" ? tareaProp : {};
  const resolverEstadoInicial = () => {
    let categoriaInicial = tarea.categoria || "";
    let infoInicial = typeof extraerTituloLimpio === "function"
      ? extraerTituloLimpio(tarea.info, tarea.categoria)
      : String(tarea.info || "");
    if (typeof parseCategoriasTarea === "function" && !parseCategoriasTarea(categoriaInicial).principal) {
      const match = String(tarea.info || "").match(/^([^|]+)\s*\|\s*(.+)$/);
      if (match) {
        const inferida = (typeof resolverCategoriaCanonica === "function" && resolverCategoriaCanonica(match[1]))
          || (typeof normalizarNombreCategoria === "function" && normalizarNombreCategoria(match[1]));
        if (inferida) {
          categoriaInicial = typeof serializarCategoriasTarea === "function"
            ? serializarCategoriasTarea(inferida, parseCategoriasTarea(categoriaInicial).subcategorias)
            : inferida;
          infoInicial = match[2].trim();
        }
      }
    }
    return { infoInicial, categoriaInicial };
  };

  let inicial = { infoInicial: String(tarea.info || ""), categoriaInicial: tarea.categoria || "" };
  try {
    inicial = resolverEstadoInicial();
  } catch (err) {
    console.warn("ROBIN: no se pudo resolver el título del entregable", err);
  }
  const detallesIniciales = parseDetallesSeguro(tarea.detalles || "");
  const [info, setInfo] = useState(inicial.infoInicial);
  const [categoria, setCategoria] = useState(inicial.categoriaInicial);
  const [marca, setMarca] = useState(() => {
    try { return normalizarMarca(tarea.marca); } catch (_) { return tarea.marca || ""; }
  });
  const [prioridad, setPrioridad] = useState(() => {
    try { return normalizarPrioridad(tarea.prioridad); } catch (_) { return tarea.prioridad || ""; }
  });
  const [estado, setEstado] = useState(() => {
    try { return normalizarEstado(tarea.estado); } catch (_) { return tarea.estado || ""; }
  });
  const [deadline, setDeadline] = useState(() => {
    try { return deadlineParaEdicion(tarea.deadline); } catch (_) { return tarea.deadline || ""; }
  });
  const [fechaInicio, setFechaInicio] = useState(() => {
    try {
      const ini = resolverFechaInicioTarea(tarea) || tarea.fechaInicio;
      return typeof fechaInicioParaEdicion === "function"
        ? fechaInicioParaEdicion(ini)
        : deadlineParaEdicion(ini);
    } catch (_) { return ""; }
  });
  const [deadlineError, setDeadlineError] = useState("");
  const [fechaInicioError, setFechaInicioError] = useState("");
  let rolesIniciales = { ejecutivos: "", contenido: "", disenadores: "" };
  try {
    if (typeof dividirCampoPersonasPorRol === "function") {
      rolesIniciales = dividirCampoPersonasPorRol(tarea.personas || "") || rolesIniciales;
    }
  } catch (err) {
    console.warn("ROBIN: no se pudieron leer las personas del entregable", err);
  }
  const [personasEjecutivos, setPersonasEjecutivos] = useState(rolesIniciales.ejecutivos);
  const [personasContenido, setPersonasContenido] = useState(rolesIniciales.contenido);
  const [personasDisenadores, setPersonasDisenadores] = useState(rolesIniciales.disenadores);
  const [mostrarContenido, setMostrarContenido] = useState(() => Boolean(String(rolesIniciales.contenido || "").trim()));
  const [mostrarDisenadores, setMostrarDisenadores] = useState(() => Boolean(String(rolesIniciales.disenadores || "").trim()));
  const [autoAbrirContenido, setAutoAbrirContenido] = useState(false);
  const [autoAbrirDisenadores, setAutoAbrirDisenadores] = useState(false);
  const [rawDetalles, setRawDetalles] = useState(tarea.detalles || "");
  const [guardando, setGuardando] = useState(false);
  const [copiadoEnlace, setCopiadoEnlace] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [autosaveEstado, setAutosaveEstado] = useState("");
  const [notes, setNotes] = useState(detallesIniciales.notes || detallesIniciales.notas || "");
  const [medidas, setMedidas] = useState(() => (
    typeof normalizarMedidas === "function"
      ? normalizarMedidas(detallesIniciales.medidas)
      : { activo: Boolean(detallesIniciales.medidas), ...(detallesIniciales.medidas || { ancho: "", alto: "", profundidad: "", unidad: "cm" }) }
  ));
  const [subtareas, setSubtareas] = useState(() => Array.isArray(detallesIniciales.subtareas) ? detallesIniciales.subtareas : []);
  const [link, setLink] = useState(detallesIniciales.link || "");
  const [editandoLink, setEditandoLink] = useState(false);
  const linkInputRef = useRef(null);
  const [subcliente, setSubcliente] = useState(() => {
    try {
      if (typeof obtenerSubclienteTarea === "function") {
        return obtenerSubclienteTarea(tarea) || detallesIniciales.subcliente || "";
      }
    } catch (_) {}
    return detallesIniciales.subcliente || "";
  });
  const titleRef = useRef(null);
  const listoAutosaveRef = useRef(false);
  const persistirCambiosRef = useRef(null);
  const taskKey = typeof getTaskSelectionKey === "function" ? getTaskSelectionKey(tarea) : String(tarea.idTarea || "");

  const linkNormalizado = typeof normalizarUrlEnlace === "function"
    ? normalizarUrlEnlace(link)
    : String(link || "").trim();

  useEffect(() => {
    if (!editandoLink) return undefined;
    const el = linkInputRef.current;
    if (!el) return undefined;
    el.focus();
    el.select();
    return undefined;
  }, [editandoLink]);

  const filasTitulo = useMemo(() => {
    if (!info) return 2;
    const anchoEstimado = typeof window !== "undefined" && window.innerWidth < 768 ? 26 : 42;
    const lineas = String(info)
      .split("\n")
      .reduce((total, linea) => total + Math.max(1, Math.ceil(linea.length / anchoEstimado)), 0);
    return Math.min(8, Math.max(2, lineas));
  }, [info]);

  const ajustarAlturaTitulo = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.max(el.scrollHeight, el.offsetHeight);
    el.style.height = `${next}px`;
  }, []);

  useLayoutEffect(() => {
    ajustarAlturaTitulo();
    const raf = requestAnimationFrame(ajustarAlturaTitulo);
    return () => cancelAnimationFrame(raf);
  }, [info, filasTitulo, ajustarAlturaTitulo]);

  const metadatosSoloLectura = soloLectura || modoDisenador;
  const estadosDisponibles = useMemo(() => {
    if (!modoDisenador) return LISTA_ESTADOS_VALIDOS;
    const base = Array.isArray(ESTADOS_DISENADOR_PERMITIDOS) ? [...ESTADOS_DISENADOR_PERMITIDOS] : [];
    const actual = normalizarEstado(estado);
    if (actual && !base.some((e) => cleanEstado(e) === cleanEstado(actual))) {
      base.unshift(actual);
    }
    return base;
  }, [modoDisenador, estado]);

  const listaEjecutivos = useMemo(() => {
    try {
      return fusionarListasPersonas(obtenerListaEjecutivosActiva(), partesCampoPersonas(personasEjecutivos));
    } catch (_) {
      return [];
    }
  }, [personasEjecutivos]);
  const listaContenido = useMemo(() => {
    try {
      return fusionarListasPersonas(obtenerListaContenidoActiva(), partesCampoPersonas(personasContenido));
    } catch (_) {
      return [];
    }
  }, [personasContenido]);
  const listaDisenadores = useMemo(() => {
    try {
      return fusionarListasPersonas(obtenerListaDisenadoresActiva(), partesCampoPersonas(personasDisenadores));
    } catch (_) {
      return [];
    }
  }, [personasDisenadores]);

  const parsed = useMemo(() => parseDetallesSeguro(rawDetalles), [rawDetalles]);

  useEffect(() => {
    if (!listoAutosaveRef.current) return;
    const detalles = tarea.detalles || "";
    const parsedDetalles = parseDetallesSeguro(detalles);
    let categoriaInicial = tarea.categoria || "";
    let infoInicial = extraerTituloLimpio(tarea.info, tarea.categoria);

    if (!parseCategoriasTarea(categoriaInicial).principal) {
      const match = String(tarea.info || "").match(/^([^|]+)\s*\|\s*(.+)$/);
      if (match) {
        const inferida = resolverCategoriaCanonica(match[1]) || normalizarNombreCategoria(match[1]);
        if (inferida) {
          categoriaInicial = serializarCategoriasTarea(inferida, parseCategoriasTarea(categoriaInicial).subcategorias);
          infoInicial = match[2].trim();
        }
      }
    }

    setInfo(infoInicial);
    setCategoria(categoriaInicial);
    setMarca(normalizarMarca(tarea.marca));
    setPrioridad(normalizarPrioridad(tarea.prioridad));
    setEstado(normalizarEstado(tarea.estado));
    setDeadline(deadlineParaEdicion(tarea.deadline));
    {
      const ini = resolverFechaInicioTarea(tarea) || tarea.fechaInicio;
      setFechaInicio(typeof fechaInicioParaEdicion === "function"
        ? fechaInicioParaEdicion(ini)
        : deadlineParaEdicion(ini));
    }
    setDeadlineError("");
    setFechaInicioError("");
    const roles = dividirCampoPersonasPorRol(tarea.personas || "");
    setPersonasEjecutivos(roles.ejecutivos);
    setPersonasContenido(roles.contenido);
    setPersonasDisenadores(roles.disenadores);
    setMostrarContenido(Boolean(String(roles.contenido || "").trim()));
    setMostrarDisenadores(Boolean(String(roles.disenadores || "").trim()));
    setAutoAbrirContenido(false);
    setAutoAbrirDisenadores(false);
    setHistorialAbierto(false);
    setRawDetalles(detalles);
    setNotes(parsedDetalles.notes || parsedDetalles.notas || "");
    setMedidas(typeof normalizarMedidas === "function"
      ? normalizarMedidas(parsedDetalles.medidas)
      : { activo: Boolean(parsedDetalles.medidas), ...(parsedDetalles.medidas || { ancho: "", alto: "", profundidad: "", unidad: "cm" }) });
    setSubtareas(Array.isArray(parsedDetalles.subtareas) ? parsedDetalles.subtareas : []);
    setLink(parsedDetalles.link || "");
    setEditandoLink(false);
    setSubcliente(obtenerSubclienteTarea(tarea) || parsedDetalles.subcliente || "");
    setAutosaveEstado("");
  }, [taskKey]);

  useEffect(() => {
    if (!listoAutosaveRef.current) return;
    const externo = typeof obtenerSubclienteTarea === "function"
      ? (obtenerSubclienteTarea(tarea) || "")
      : String(tarea.subcliente || "").trim();
    setSubcliente((prev) => {
      if (typeof subclientesCoinciden === "function") {
        return subclientesCoinciden(prev, externo) ? prev : externo;
      }
      return String(prev || "") === String(externo || "") ? prev : externo;
    });
  }, [tarea.detalles, tarea.subcliente, taskKey]);

  const estadoVisual = useMemo(() => {
    const mapa = Array.isArray(ESTADOS_MAPA) ? ESTADOS_MAPA : [];
    return mapa.find(e => cleanEstado(e.id) === cleanEstado(estado)) || mapa[0] || { id: estado, dot: "" };
  }, [estado]);

  const opcionesMarca = useMemo(() => {
    const base = Array.isArray(marcasDisponibles) ? [...marcasDisponibles] : [];
    const actual = normalizarMarca(marca);
    if (actual && !base.some(opt => marcasCoinciden(opt, actual))) {
      base.unshift(actual);
    }
    return base;
  }, [marcasDisponibles, marca]);

  const serializarConMeta = (notasVal, subtareasVal, historialVal, linkVal, subclienteVal, medidasVal) =>
    serializeDetalles(notasVal, subtareasVal, historialVal, linkVal, subclienteVal, {
      flujo: parsed.flujo || "",
      importKey: parsed.importKey || "",
      envioTipo: parsed.envioTipo || "",
      pendienteCor: Boolean(parsed.pendienteCor),
      medidas: typeof medidasParaGuardar === "function" ? medidasParaGuardar(medidasVal || medidas) : (medidasVal || medidas)
    });

  const handleSubtareasChange = (nuevas) => {
    setSubtareas(nuevas);
    setRawDetalles(serializarConMeta(notes, nuevas, parsed.historial, link, subcliente, medidas));
  };

  const handleNotasChange = (newNotas) => {
    setNotes(newNotas);
    setRawDetalles(serializarConMeta(newNotas, subtareas, parsed.historial, link, subcliente, medidas));
  };

  const handleMedidasChange = (nuevas) => {
    setMedidas(nuevas);
    setRawDetalles(serializarConMeta(notes, subtareas, parsed.historial, link, subcliente, nuevas));
  };

  const handleLinkChange = (val) => {
    setLink(val);
    setRawDetalles(serializarConMeta(notes, subtareas, parsed.historial, val, subcliente, medidas));
  };

  const handleSubclienteChange = (val) => {
    setSubcliente(val);
    setRawDetalles(serializarConMeta(notes, subtareas, parsed.historial, link, val, medidas));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await persistirCambios({ keepOpen: true });
  };

  const armarTareaDesdeFormulario = () => {
    const tFinal = serializarConMeta(notes, subtareas, parsed.historial, link, subcliente, medidas);
    const subclienteNorm = normalizarNombreSubcliente(subcliente);

    if (soloLectura || modoDisenador) {
      return {
        ok: true,
        tarea: prepararTareaConCategoria({
          ...tarea,
          ...(modoDisenador ? { estado: normalizarEstado(estado) } : {}),
          subcliente: subclienteNorm,
          detalles: tFinal
        })
      };
    }

    const fechaNorm = normalizarDeadline(deadline);
    if (!fechaNorm) {
      return {
        ok: false,
        deadlineError: "Fecha no válida. Ej: 16/06/2026 o TBD"
      };
    }
    const normInicio = (v) => (typeof normalizarFechaInicio === "function"
      ? normalizarFechaInicio(v)
      : normalizarDeadline(v));
    const inicioNorm = fechaInicio.trim()
      ? normInicio(fechaInicio)
      : normInicio(resolverFechaInicioTarea({ ...tarea, detalles: tFinal }) || fechaHoyDisplay());
    if (!inicioNorm) {
      return { ok: false, fechaInicioError: "Fecha no válida. Ej: 16/06/2026" };
    }
    if (
      !(typeof esDeadlineTbd === "function" && esDeadlineTbd(fechaNorm))
      && inicioNorm
      && obtenerTiempoFecha(inicioNorm) > obtenerTiempoFecha(fechaNorm)
    ) {
      return { ok: false, fechaInicioError: "El inicio no puede ser después de la entrega" };
    }
    const personas = combinarRolesPersonas(personasEjecutivos, personasContenido, personasDisenadores);
    return {
      ok: true,
      tarea: prepararTareaConCategoria({
        ...tarea,
        info: info.trim(),
        categoria,
        subcliente: subclienteNorm,
        marca: normalizarMarca(marca),
        prioridad: normalizarPrioridad(prioridad),
        estado: normalizarEstado(estado),
        deadline: fechaNorm,
        fechaInicio: inicioNorm,
        personas,
        detalles: tFinal
      })
    };
  };

  const handleNotasChatCommit = async ({ modo, texto, pendienteCor }) => {
    if (soloLectura) return false;
    const detallesBase = serializarConMeta(notes, subtareas, parsed.historial, link, subcliente, medidas);
    const baseTarea = {
      ...tarea,
      detalles: detallesBase,
      pendienteCor: parsed.pendienteCor
    };
    const opts = { pendienteCor: Boolean(pendienteCor) };
    let actualizada = baseTarea;
    if (modo === "edit" && typeof actualizarUltimaEntradaComentarioEstatus === "function") {
      actualizada = actualizarUltimaEntradaComentarioEstatus(baseTarea, texto, usuario, opts);
    } else if (typeof aplicarComentarioEstatus === "function") {
      actualizada = aplicarComentarioEstatus(baseTarea, texto, usuario, undefined, opts);
    } else {
      return false;
    }

    const p = parseDetallesSeguro(actualizada.detalles);
    setNotes(p.notas || p.notes || "");
    setRawDetalles(actualizada.detalles);

    const armado = armarTareaDesdeFormulario();
    if (!armado.ok) {
      setDeadlineError(armado.deadlineError || "");
      setFechaInicioError(armado.fechaInicioError || "");
      return false;
    }
    const tareaGuardar = {
      ...armado.tarea,
      detalles: actualizada.detalles,
      pendienteCor: Boolean(actualizada.pendienteCor)
    };
    setAutosaveEstado("saving");
    try {
      await Promise.resolve(onSave(tareaGuardar, { keepOpen: true, silencioso: true }));
      setAutosaveEstado("saved");
      if (typeof onToast === "function") {
        onToast(
          pendienteCor
            ? "Comentario guardado. Quedó en Por subir en COR."
            : "Comentario guardado",
          "success"
        );
      }
      return true;
    } catch (err) {
      setAutosaveEstado("error");
      if (typeof onToast === "function") onToast("No se pudo guardar el comentario", "error");
      return false;
    }
  };

  const persistirCambios = async (opciones = {}) => {
    const resultado = armarTareaDesdeFormulario();
    if (!resultado.ok) {
      setDeadlineError(resultado.deadlineError || "");
      setFechaInicioError(resultado.fechaInicioError || "");
      return false;
    }
    setDeadlineError("");
    setFechaInicioError("");
    setAutosaveEstado("saving");
    try {
      await Promise.resolve(onSave(resultado.tarea, { keepOpen: true, silencioso: true, ...opciones }));
      setAutosaveEstado("saved");
      return true;
    } catch (err) {
      setAutosaveEstado("error");
      return false;
    }
  };
  persistirCambiosRef.current = persistirCambios;

  useEffect(() => {
    if (soloLectura && !modoDisenador) return undefined;
    if (!listoAutosaveRef.current) {
      listoAutosaveRef.current = true;
      return undefined;
    }
    setAutosaveEstado("saving");
    const timer = setTimeout(() => {
      if (typeof persistirCambiosRef.current === "function") persistirCambiosRef.current();
    }, 550);
    return () => clearTimeout(timer);
  }, [
    info,
    categoria,
    marca,
    prioridad,
    estado,
    deadline,
    fechaInicio,
    personasEjecutivos,
    personasContenido,
    personasDisenadores,
    notes,
    subtareas,
    medidas,
    link,
    subcliente,
    soloLectura,
    modoDisenador
  ]);

  const inputPropClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none cursor-pointer font-medium";
  const inputPropTextClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none font-medium placeholder-zinc-400";
  const readOnlyClass = "w-full text-ui-sm text-[#37352F] font-medium";

  const aplicarEstadoRapido = async (nuevoEstado) => {
    if (!modoDisenador || guardando) return;
    setEstado(nuevoEstado);
    const tFinal = serializarConMeta(notes, subtareas, parsed.historial, link, subcliente, medidas);
    const tareaPreparada = prepararTareaConCategoria({
      ...tarea,
      estado: normalizarEstado(nuevoEstado),
      subcliente: normalizarNombreSubcliente(subcliente),
      detalles: tFinal
    });
    setGuardando(true);
    try {
      await Promise.resolve(onSave(tareaPreparada, { keepOpen: true, silencioso: true }));
      setAutosaveEstado("saved");
    } finally {
      setGuardando(false);
    }
  };

  const handleCompartirEnlace = async () => {
    const enlace = construirEnlaceTarea(tarea);
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiadoEnlace(true);
      if (onToast) onToast("Enlace copiado", "success");
      setTimeout(() => setCopiadoEnlace(false), 2000);
    } catch {
      if (onToast) onToast("No se pudo copiar el enlace", "error");
    }
  };

  const abrirRelacionada = (otra) => {
    if (typeof onAbrirTareaRelacionada === "function") {
      onAbrirTareaRelacionada(otra);
    }
  };

  const propsRelacionadas = {
    tarea,
    tareas,
    relaciones: relacionesTareas,
    usuario,
    onRelacionCreada,
    onAbrirTarea: abrirRelacionada,
    onToast,
    getMarcaStyle,
    subcliente,
    marca,
    onDuplicarSubcliente: (!soloLectura && !modoDisenador) ? onDuplicarSubcliente : undefined
  };

  return (
    <div className="task-sheet-overlay">
      <button
        type="button"
        onClick={onClose}
        className="task-sheet-backdrop"
        aria-label="Cerrar entregable"
      />

      <div className="task-sheet-stack">
      <div className="task-sheet-panel">
        <form onSubmit={handleSubmit} className="task-form-layout task-form-page min-h-0 flex-1">
          <div className="task-form-scroll">
          <div className="sticky top-0 z-10 relative bg-white/95 backdrop-blur-sm pt-3 pb-1 px-6 md:px-10 lg:pt-4">
            <div className="task-sheet-handle" aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 md:right-8 w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              aria-label="Cerrar"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
            {(marca || subcliente) && (
              <nav className="task-sheet-breadcrumb max-w-3xl mx-auto w-full pr-8" aria-label="Ruta del entregable">
                {marca ? (
                  typeof onAbrirMarca === "function" ? (
                    <button
                      type="button"
                      className="task-sheet-breadcrumb__link"
                      onClick={() => {
                        if (typeof onClose === "function") onClose();
                        onAbrirMarca(marca);
                      }}
                    >
                      {typeof formatearMarca === "function" ? formatearMarca(marca) : marca}
                    </button>
                  ) : (
                    <span className="task-sheet-breadcrumb__text">
                      {typeof formatearMarca === "function" ? formatearMarca(marca) : marca}
                    </span>
                  )
                ) : null}
                {subcliente ? (
                  <>
                    <span className="task-sheet-breadcrumb__sep" aria-hidden="true">/</span>
                    {typeof onAbrirMacro === "function" ? (
                      <button
                        type="button"
                        className="task-sheet-breadcrumb__link"
                        onClick={() => {
                          if (typeof onClose === "function") onClose();
                          onAbrirMacro(marca, subcliente);
                        }}
                      >
                        {subcliente}
                      </button>
                    ) : (
                      <span className="task-sheet-breadcrumb__text">{subcliente}</span>
                    )}
                  </>
                ) : null}
                <span className="task-sheet-breadcrumb__sep" aria-hidden="true">/</span>
                <span className="task-sheet-breadcrumb__current" aria-current="page" title={info || "Sin título"}>
                  {info || "Sin título"}
                </span>
              </nav>
            )}
          </div>

          {/* Encabezado estilo Notion */}
          <div className="relative px-6 md:px-10 pb-4 max-w-3xl mx-auto w-full">
            {metadatosSoloLectura ? (
              <h2 className="task-form-title w-full pr-8 text-2xl md:text-[1.75rem] font-bold text-[#37352F] leading-snug break-words whitespace-pre-wrap">
                {info || "Sin título"}
              </h2>
            ) : (
              <textarea
                ref={titleRef}
                required
                rows={filasTitulo}
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                onInput={ajustarAlturaTitulo}
                placeholder="Sin título"
                className="task-form-title task-form-title-input w-full pr-8 text-2xl md:text-[1.75rem] font-bold text-[#37352F] bg-transparent border-0 focus:outline-none placeholder-zinc-300 leading-normal md:leading-snug resize-none"
              />
            )}
            {cleanIdTarea(tarea.idTarea) && (
              <span className="inline-block mt-1.5 text-[11px] font-mono text-zinc-400">
                {cleanIdTarea(tarea.idTarea)}
              </span>
            )}
          </div>

          <div className="max-w-3xl mx-auto w-full px-6 md:px-10 pb-4">
          {/* Propiedades lineales */}
          <div className="pb-2 flex flex-col gap-0.5 border-b border-zinc-100">
            <PropertyRow icon="fa-regular fa-building" label="Cliente">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>{formatearMarca(marca)}</span>
              ) : (
                <select
                  value={marca}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMarca(next);
                    if (subcliente) handleSubclienteChange("");
                  }}
                  className={inputPropClass}
                >
                  {opcionesMarca.map(m => (
                    <option key={m} value={m}>{formatearMarca(m)}</option>
                  ))}
                </select>
              )}
            </PropertyRow>

            <PropertyRow icon="fa-solid fa-store" label="Subcliente">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>{subcliente || "—"}</span>
              ) : (
                <SelectorSubclienteChip
                  valor={subcliente}
                  onChange={handleSubclienteChange}
                  marca={marca}
                  listaGlobal={listaSubclientes}
                  registrarNuevoSubcliente={registrarNuevoSubcliente}
                  onEliminarSubcliente={onEliminarSubcliente}
                  tareas={tareas}
                  variant="minimal"
                />
              )}
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-circle-dot" label="Estado">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${estadoVisual.dot}`} />
                {metadatosSoloLectura && !modoDisenador ? (
                  <span className={readOnlyClass}>{estado || "—"}</span>
                ) : (
                  <select value={estado} onChange={(e) => setEstado(e.target.value)} className={inputPropClass}>
                    {estadosDisponibles.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            </PropertyRow>

            <PropertyRow icon="fa-solid fa-signal" label="Prioridad">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>
                  {PRIORIDADES_MAPA.find(p => p.id === prioridad)?.label || prioridad || "—"}
                </span>
              ) : (
                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputPropClass}>
                  {PRIORIDADES_MAPA.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              )}
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-calendar-check" label="Inicio">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>{fechaInicio || "—"}</span>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <InputFechaLibre
                    value={fechaInicio}
                    onChange={(val) => { setFechaInicio(val); if (fechaInicioError) setFechaInicioError(""); }}
                    className={inputPropClass}
                  />
                  {fechaInicioError && (
                    <span className="text-[11px] text-red-500">{fechaInicioError}</span>
                  )}
                </div>
              )}
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-calendar" label="Entrega">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>{deadline || "TBD"}</span>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <InputFechaLibre
                    value={deadline}
                    onChange={(val) => { setDeadline(val); if (deadlineError) setDeadlineError(""); }}
                    className={inputPropClass}
                    placeholder="TBD o dd/mm/aaaa"
                    emptyAsTbd
                  />
                  {deadlineError && (
                    <span className="text-[11px] text-red-500">{deadlineError}</span>
                  )}
                </div>
              )}
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-folder" label="Categoría">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>
                  {(() => {
                    const partes = typeof partesCampoCategorias === "function"
                      ? partesCampoCategorias(categoria)
                      : [];
                    return partes.length ? partes.join(", ") : (categoria || "—");
                  })()}
                </span>
              ) : (
                <SelectorCategoriasChips
                  categoriasSeleccionadas={categoria}
                  onChange={setCategoria}
                  listaGlobal={listaCategorias}
                  registrarNuevaCategoria={registrarNuevaCategoria}
                  variant="minimal"
                />
              )}
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-user" label="Ejecutivos">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>{personasEjecutivos || "—"}</span>
              ) : (
                <SelectorPersonasChips
                  personasSeleccionadas={personasEjecutivos}
                  onChange={setPersonasEjecutivos}
                  listaGlobal={listaEjecutivos}
                  registrarNuevaPersona={registrarNuevaPersona}
                  variant="minimal"
                  titulo="Ejecutivos"
                />
              )}
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-user" label="Contenido">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>{personasContenido || "—"}</span>
              ) : (
                <SelectorPersonasChips
                  personasSeleccionadas={personasContenido}
                  onChange={setPersonasContenido}
                  listaGlobal={listaContenido}
                  registrarNuevaPersona={registrarNuevaPersona}
                  variant="minimal"
                  titulo="Contenido"
                />
              )}
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-user" label="Diseñadores">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>{personasDisenadores || "—"}</span>
              ) : (
                <SelectorPersonasChips
                  personasSeleccionadas={personasDisenadores}
                  onChange={setPersonasDisenadores}
                  listaGlobal={listaDisenadores}
                  registrarNuevaPersona={registrarNuevaPersona}
                  variant="minimal"
                  expandirTradeComo="disenadores"
                  titulo="Diseñadores"
                />
              )}
            </PropertyRow>

            <PropertyRow icon="fa-solid fa-link" label="Enlace">
              <div className="flex items-center gap-2 min-w-0">
                {linkNormalizado && !editandoLink ? (
                  <a
                    href={linkNormalizado}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="task-link-open-btn"
                    title="Abrir enlace"
                  >
                    <span className="task-link-open-btn__text">{link}</span>
                    <i className="fa-solid fa-arrow-up-right-from-square task-link-open-btn__icon" aria-hidden="true" />
                  </a>
                ) : metadatosSoloLectura ? (
                  <span className={`${readOnlyClass} truncate`}>{link || "—"}</span>
                ) : (
                  <input
                    ref={linkInputRef}
                    type="url"
                    value={link}
                    onChange={(e) => handleLinkChange(e.target.value)}
                    onBlur={() => setEditandoLink(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setEditandoLink(false);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditandoLink(false);
                      }
                    }}
                    placeholder="https://..."
                    className={inputPropTextClass}
                  />
                )}
                {!metadatosSoloLectura && linkNormalizado && !editandoLink ? (
                  <button
                    type="button"
                    className="task-link-edit-btn"
                    title="Editar enlace"
                    aria-label="Editar enlace"
                    onClick={() => setEditandoLink(true)}
                  >
                    <i className="fa-solid fa-pen" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </PropertyRow>

            {!soloLectura && (
              <PropertyRow icon="fa-solid fa-link" label="Relacionadas">
                <TareasRelacionadas zona="controls" {...propsRelacionadas} />
              </PropertyRow>
            )}
          </div>

          <TareasRelacionadas zona="internal" {...propsRelacionadas} />

          {modoDisenador && cleanEstado(estado) !== "completada" && (
            <div className="px-6 md:px-10 py-3 flex flex-wrap gap-2 border-b border-zinc-100 max-w-3xl mx-auto w-full">
              {cleanEstado(estado) !== "en revision" && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => aplicarEstadoRapido("En revision")}
                  className="task-accion-rapida task-accion-rapida--review"
                >
                  <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                  Enviar a revisión
                </button>
              )}
              {cleanEstado(estado) !== "en progreso" && cleanEstado(estado) !== "en revision" && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => aplicarEstadoRapido("En progreso")}
                  className="task-accion-rapida task-accion-rapida--progress"
                >
                  <i className="fa-solid fa-play" aria-hidden="true" />
                  En progreso
                </button>
              )}
              <button
                type="button"
                disabled={guardando}
                onClick={() => aplicarEstadoRapido("Completada")}
                className="task-accion-rapida task-accion-rapida--done"
              >
                <i className="fa-solid fa-check" aria-hidden="true" />
                Completar
              </button>
            </div>
          )}

          {usuario && (
            <ComentariosTarea
              tarea={tarea}
              usuario={usuario}
              nombreUsuario={nombreUsuario}
              listaPersonas={listaPersonas}
              onComentarioPublicado={onComentarioPublicado}
              onToast={onToast}
            />
          )}

          <ListaSubtareas subtareas={subtareas} onChange={handleSubtareasChange} />

          {/* Notas */}
          <div className="py-4 border-b border-zinc-100">
            <div className="task-section-label flex items-center justify-between gap-2 mb-2 text-ui-sm text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <i className="fa-regular fa-note-sticky text-zinc-400 text-[11px]" />
                <span>Notas</span>
              </span>
            </div>
            <CuadroMedidas
              value={medidas}
              onChange={handleMedidasChange}
              onSave={() => persistirCambios({ keepOpen: true })}
              disabled={soloLectura}
            />
            <NotasChatPanel
              notes={notes}
              usuario={usuario}
              nombreUsuario={nombreUsuario}
              soloLectura={soloLectura}
              disabled={guardando}
              onCommit={handleNotasChatCommit}
            />
          </div>

          {parsed.historial && parsed.historial.length > 0 && (
            <div className="pb-4">
              <button
                type="button"
                className="task-historial-toggle"
                aria-expanded={historialAbierto}
                onClick={() => setHistorialAbierto((abierto) => !abierto)}
              >
                <span className="task-historial-toggle__label">
                  <i className="fa-regular fa-clock text-zinc-400 text-[11px]" aria-hidden="true" />
                  <span>Historial</span>
                  <span className="task-historial-toggle__count">{parsed.historial.length}</span>
                </span>
                <i
                  className={`fa-solid fa-chevron-down task-historial-toggle__chevron${historialAbierto ? " is-open" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {historialAbierto && (
                <div className="task-historial-panel flex flex-col gap-1 pl-5 border-l-2 border-zinc-100 mt-2">
                  {parsed.historial.map((line, idx) => (
                    <p key={idx} className="text-[11px] text-zinc-400 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          </div>
          </div>

          <div className="task-form-actions px-6 md:px-10 py-3 flex justify-between gap-2 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-1">
              {typeof onDelete === "function" && !modoDisenador && !soloLectura && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="task-form-delete-btn"
                  title="Eliminar entregable"
                  aria-label="Eliminar entregable"
                >
                  <i className="fa-regular fa-trash-can" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={handleCompartirEnlace}
                className="task-form-secondary-btn"
                title="Copiar enlace"
              >
                <i className={`fa-solid ${copiadoEnlace ? "fa-check" : "fa-link"}`} aria-hidden="true" />
                {copiadoEnlace ? "Copiado" : "Compartir"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-400 min-w-[72px]">
                {autosaveEstado === "saving" ? "Guardando…" : autosaveEstado === "saved" ? "Guardado" : autosaveEstado === "error" ? "No se pudo guardar" : ""}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-ui-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 rounded transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </form>
      </div>

      <TareasRelacionadas zona="external" {...propsRelacionadas} />
      </div>
    </div>
  );
}
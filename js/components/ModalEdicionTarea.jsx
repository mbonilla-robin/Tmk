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

function ModalEdicionTarea({ tarea, onClose, onSave, listaPersonas, registrarNuevaPersona, listaCategorias, registrarNuevaCategoria, listaSubclientes, registrarNuevoSubcliente, marcasDisponibles, usuario, nombreUsuario, onComentarioPublicado, onToast, soloLectura = false, modoDisenador = false, tareas = [], relacionesTareas = [], onRelacionCreada, onAbrirTareaRelacionada, getMarcaStyle }) {
  const resolverEstadoInicial = () => {
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
    return { infoInicial, categoriaInicial };
  };

  const inicial = resolverEstadoInicial();
  const [info, setInfo] = useState(inicial.infoInicial);
  const [categoria, setCategoria] = useState(inicial.categoriaInicial);
  const [marca, setMarca] = useState(normalizarMarca(tarea.marca));
  const [prioridad, setPrioridad] = useState(normalizarPrioridad(tarea.prioridad));
  const [estado, setEstado] = useState(normalizarEstado(tarea.estado));
  const [deadline, setDeadline] = useState(deadlineParaEdicion(tarea.deadline));
  const [fechaInicio, setFechaInicio] = useState(() => deadlineParaEdicion(resolverFechaInicioTarea(tarea) || tarea.fechaInicio));
  const [deadlineError, setDeadlineError] = useState("");
  const [fechaInicioError, setFechaInicioError] = useState("");
  const rolesIniciales = dividirCampoPersonasPorRol(tarea.personas || "");
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
  const titleRef = useRef(null);

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
    const base = [...ESTADOS_DISENADOR_PERMITIDOS];
    const actual = normalizarEstado(estado);
    if (actual && !base.some((e) => cleanEstado(e) === cleanEstado(actual))) {
      base.unshift(actual);
    }
    return base;
  }, [modoDisenador, estado]);

  const listaEjecutivos = useMemo(
    () => fusionarListasPersonas(obtenerListaEjecutivosActiva(), partesCampoPersonas(personasEjecutivos)),
    [personasEjecutivos]
  );
  const listaContenido = useMemo(
    () => fusionarListasPersonas(obtenerListaContenidoActiva(), partesCampoPersonas(personasContenido)),
    [personasContenido]
  );
  const listaDisenadores = useMemo(
    () => fusionarListasPersonas(obtenerListaDisenadoresActiva(), partesCampoPersonas(personasDisenadores)),
    [personasDisenadores]
  );

  const parsed = useMemo(() => parseDetalles(rawDetalles), [rawDetalles]);
  
  const [notes, setNotes] = useState(parsed.notes || parsed.notas);
  const [subtareas, setSubtareas] = useState(parsed.subtareas);
  const [link, setLink] = useState(parsed.link || "");
  const [subcliente, setSubcliente] = useState(
    () => obtenerSubclienteTarea(tarea) || parsed.subcliente || ""
  );

  useEffect(() => {
    const detalles = tarea.detalles || "";
    const parsedDetalles = parseDetalles(detalles);
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
    setFechaInicio(deadlineParaEdicion(resolverFechaInicioTarea(tarea) || tarea.fechaInicio));
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
    setRawDetalles(detalles);
    setNotes(parsedDetalles.notes || parsedDetalles.notas);
    setSubtareas(parsedDetalles.subtareas);
    setLink(parsedDetalles.link || "");
    setSubcliente(obtenerSubclienteTarea(tarea) || parsedDetalles.subcliente || "");
  }, [
    tarea.idTarea,
    tarea.info,
    tarea.categoria,
    tarea.marca,
    tarea.prioridad,
    tarea.estado,
    tarea.deadline,
    tarea.fechaInicio,
    tarea.personas,
    tarea.detalles,
    tarea.subcliente
  ]);

  const estadoVisual = useMemo(() => {
    return ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(estado)) || ESTADOS_MAPA[0];
  }, [estado]);

  const opcionesMarca = useMemo(() => {
    const base = [...marcasDisponibles];
    const actual = normalizarMarca(marca);
    if (actual && !base.some(opt => marcasCoinciden(opt, actual))) {
      base.unshift(actual);
    }
    return base;
  }, [marcasDisponibles, marca]);

  const serializarConMeta = (notasVal, subtareasVal, historialVal, linkVal, subclienteVal) =>
    serializeDetalles(notasVal, subtareasVal, historialVal, linkVal, subclienteVal);

  const handleSubtareasChange = (nuevas) => {
    setSubtareas(nuevas);
    setRawDetalles(serializarConMeta(notes, nuevas, parsed.historial, link, subcliente));
  };

  const handleNotasChange = (newNotas) => {
    setNotes(newNotas);
    setRawDetalles(serializarConMeta(newNotas, subtareas, parsed.historial, link, subcliente));
  };

  const handleLinkChange = (val) => {
    setLink(val);
    setRawDetalles(serializarConMeta(notes, subtareas, parsed.historial, val, subcliente));
  };

  const handleSubclienteChange = (val) => {
    setSubcliente(val);
    setRawDetalles(serializarConMeta(notes, subtareas, parsed.historial, link, val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tFinal = serializarConMeta(notes, subtareas, parsed.historial, link, subcliente);
    const subclienteNorm = normalizarNombreSubcliente(subcliente);

    if (soloLectura || modoDisenador) {
      const tareaPreparada = prepararTareaConCategoria({
        ...tarea,
        ...(modoDisenador ? { estado: normalizarEstado(estado) } : {}),
        subcliente: subclienteNorm,
        detalles: tFinal
      });
      setGuardando(true);
      try {
        await Promise.resolve(onSave(tareaPreparada));
      } finally {
        setGuardando(false);
      }
      return;
    }

    const fechaNorm = normalizarDeadline(deadline);
    if (!fechaNorm) {
      setDeadlineError(deadline.trim() ? "Fecha no válida. Ej: 16/06/2026" : "La fecha de entrega es obligatoria");
      return;
    }
    const inicioNorm = fechaInicio.trim()
      ? normalizarDeadline(fechaInicio)
      : normalizarDeadline(resolverFechaInicioTarea({ ...tarea, detalles: tFinal }) || fechaHoyDisplay());
    if (!inicioNorm) {
      setFechaInicioError("Fecha no válida. Ej: 16/06/2026");
      return;
    }
    if (inicioNorm && obtenerTiempoFecha(inicioNorm) > obtenerTiempoFecha(fechaNorm)) {
      setFechaInicioError("El inicio no puede ser después de la entrega");
      return;
    }
    setDeadlineError("");
    setFechaInicioError("");
    const personas = combinarRolesPersonas(personasEjecutivos, personasContenido, personasDisenadores);
    const tareaPreparada = prepararTareaConCategoria({
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
    });
    setGuardando(true);
    try {
      await Promise.resolve(onSave(tareaPreparada));
    } finally {
      setGuardando(false);
    }
  };

  const inputPropClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none cursor-pointer font-medium";
  const inputPropTextClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none font-medium placeholder-zinc-400";
  const readOnlyClass = "w-full text-ui-sm text-[#37352F] font-medium";

  const aplicarEstadoRapido = async (nuevoEstado) => {
    if (!modoDisenador || guardando) return;
    setEstado(nuevoEstado);
    const tFinal = serializarConMeta(notes, subtareas, parsed.historial, link, subcliente);
    const tareaPreparada = prepararTareaConCategoria({
      ...tarea,
      estado: normalizarEstado(nuevoEstado),
      subcliente: normalizarNombreSubcliente(subcliente),
      detalles: tFinal
    });
    setGuardando(true);
    try {
      await Promise.resolve(onSave(tareaPreparada));
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
    getMarcaStyle
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
                <span className={readOnlyClass}>{deadline || "—"}</span>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <InputFechaLibre
                    value={deadline}
                    onChange={(val) => { setDeadline(val); if (deadlineError) setDeadlineError(""); }}
                    className={inputPropClass}
                    required
                  />
                  {deadlineError && (
                    <span className="text-[11px] text-red-500">{deadlineError}</span>
                  )}
                </div>
              )}
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-folder" label="Categoría">
              {metadatosSoloLectura ? (
                <span className={readOnlyClass}>{parseCategoriasTarea(categoria).principal || categoria || "—"}</span>
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
                {metadatosSoloLectura ? (
                  <span className={`${readOnlyClass} truncate`}>{link || "—"}</span>
                ) : (
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleLinkChange(e.target.value)}
                    placeholder="https://..."
                    className={inputPropTextClass}
                  />
                )}
                {normalizarUrlEnlace(link) && (
                  <a
                    href={normalizarUrlEnlace(link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="task-link-open shrink-0 text-zinc-400 hover:text-blue-600 transition-colors"
                    title="Abrir enlace"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
                  </a>
                )}
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
            <div className="task-section-label flex items-center gap-2 mb-2 text-ui-sm text-zinc-500">
              <i className="fa-regular fa-note-sticky text-zinc-400 text-[11px]" />
              <span>Notas</span>
            </div>
            <EditorNotasRich
              value={notes}
              onChange={handleNotasChange}
            />
          </div>

          {parsed.historial && parsed.historial.length > 0 && (
            <div className="pb-4">
              <div className="flex items-center gap-2 mb-2 text-ui-sm text-zinc-500">
                <i className="fa-regular fa-clock text-zinc-400 text-[11px]" />
                <span>Historial</span>
              </div>
              <div className="flex flex-col gap-1 pl-5 border-l-2 border-zinc-100">
                {parsed.historial.map((line, idx) => (
                  <p key={idx} className="text-[11px] text-zinc-400 leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          </div>
          </div>

          <div className="task-form-actions px-6 md:px-10 py-3 flex justify-between gap-2 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-1">
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
            <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-ui-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-1.5 bg-[#37352F] text-white text-ui-sm font-medium rounded hover:bg-[#2c2a26] disabled:opacity-50 transition-colors min-w-[88px]"
            >
              {guardando ? "Guardando…" : "Guardar"}
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
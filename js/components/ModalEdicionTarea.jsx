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

function ModalEdicionTarea({ tarea, onClose, onSave, listaPersonas, registrarNuevaPersona, listaCategorias, registrarNuevaCategoria, marcasDisponibles }) {
  const resolverEstadoInicial = () => {
    let categoriaInicial = tarea.categoria || "";
    let infoInicial = extraerTituloLimpio(tarea.info, tarea.categoria);
    if (!parseCategoriasTarea(categoriaInicial).principal) {
      const match = String(tarea.info || "").match(/^([^|]+)\s*\|\s*(.+)$/);
      if (match) {
        const inferida = resolverCategoriaCanonica(match[1]);
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
  const [deadlineError, setDeadlineError] = useState("");
  const [personas, setPersonas] = useState(tarea.personas || "");
  const [rawDetalles, setRawDetalles] = useState(tarea.detalles || "");
  const [guardando, setGuardando] = useState(false);

  const parsed = useMemo(() => parseDetalles(rawDetalles), [rawDetalles]);
  
  const [notes, setNotes] = useState(parsed.notes || parsed.notas);
  const [subtareas, setSubtareas] = useState(parsed.subtareas);
  const [link, setLink] = useState(parsed.link || "");

  useEffect(() => {
    const detalles = tarea.detalles || "";
    const parsedDetalles = parseDetalles(detalles);
    let categoriaInicial = tarea.categoria || "";
    let infoInicial = extraerTituloLimpio(tarea.info, tarea.categoria);

    if (!parseCategoriasTarea(categoriaInicial).principal) {
      const match = String(tarea.info || "").match(/^([^|]+)\s*\|\s*(.+)$/);
      if (match) {
        const inferida = resolverCategoriaCanonica(match[1]);
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
    setDeadlineError("");
    setPersonas(tarea.personas || "");
    setRawDetalles(detalles);
    setNotes(parsedDetalles.notes || parsedDetalles.notas);
    setSubtareas(parsedDetalles.subtareas);
    setLink(parsedDetalles.link || "");
  }, [
    tarea.idTarea,
    tarea.info,
    tarea.categoria,
    tarea.marca,
    tarea.prioridad,
    tarea.estado,
    tarea.deadline,
    tarea.personas,
    tarea.detalles
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

  const handleSubtareasChange = (nuevas) => {
    setSubtareas(nuevas);
    setRawDetalles(serializeDetalles(notes, nuevas, parsed.historial, link));
  };

  const handleNotasChange = (newNotas) => {
    setNotes(newNotas);
    setRawDetalles(serializeDetalles(newNotas, subtareas, parsed.historial, link));
  };

  const handleLinkChange = (val) => {
    setLink(val);
    setRawDetalles(serializeDetalles(notes, subtareas, parsed.historial, val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fechaNorm = normalizarDeadline(deadline);
    if (!fechaNorm) {
      setDeadlineError(deadline.trim() ? "Fecha no válida. Ej: 16/06/2026" : "La fecha de entrega es obligatoria");
      return;
    }
    setDeadlineError("");
    const tFinal = serializeDetalles(notes, subtareas, parsed.historial, link);
    const tareaPreparada = prepararTareaConCategoria({
      ...tarea,
      info: info.trim(),
      categoria,
      marca: normalizarMarca(marca),
      prioridad: normalizarPrioridad(prioridad),
      estado: normalizarEstado(estado),
      deadline: fechaNorm,
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

  return (
    <div className="task-sheet-overlay">
      <button
        type="button"
        onClick={onClose}
        className="task-sheet-backdrop"
        aria-label="Cerrar entregable"
      />

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
            <input
              type="text"
              required
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder="Sin título"
              className="task-form-title w-full pr-8 text-2xl md:text-[1.75rem] font-bold text-[#37352F] bg-transparent border-0 focus:outline-none placeholder-zinc-300 leading-snug"
            />
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
              <select value={marca} onChange={(e) => setMarca(e.target.value)} className={inputPropClass}>
                {opcionesMarca.map(m => (
                  <option key={m} value={m}>{formatearMarca(m)}</option>
                ))}
              </select>
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-circle-dot" label="Estado">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${estadoVisual.dot}`} />
                <select value={estado} onChange={(e) => setEstado(e.target.value)} className={inputPropClass}>
                  {LISTA_ESTADOS_VALIDOS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </PropertyRow>

            <PropertyRow icon="fa-solid fa-signal" label="Prioridad">
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputPropClass}>
                {PRIORIDADES_MAPA.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-folder" label="Categoría">
              <SelectorCategoriasChips
                categoriasSeleccionadas={categoria}
                onChange={setCategoria}
                listaGlobal={listaCategorias}
                registrarNuevaCategoria={registrarNuevaCategoria}
                variant="minimal"
              />
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-calendar" label="Entrega">
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
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-user" label="Asignados">
              <SelectorPersonasChips
                personasSeleccionadas={personas}
                onChange={setPersonas}
                listaGlobal={listaPersonas}
                registrarNuevaPersona={registrarNuevaPersona}
                variant="minimal"
              />
            </PropertyRow>
          </div>

          <PropertyRow icon="fa-solid fa-link" label="Enlace">
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="url"
                value={link}
                onChange={(e) => handleLinkChange(e.target.value)}
                placeholder="https://..."
                className={inputPropTextClass}
              />
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

          <ListaSubtareas subtareas={subtareas} onChange={handleSubtareasChange} />

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

          <div className="task-form-actions px-6 md:px-10 py-3 flex justify-end gap-2 max-w-3xl mx-auto w-full">
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
        </form>
      </div>
    </div>
  );
}
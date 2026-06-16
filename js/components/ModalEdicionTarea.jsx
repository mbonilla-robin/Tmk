function PropertyRow({ icon, label, children }) {
  return (
    <div className="group flex items-center min-h-[34px] py-0.5 px-1 -mx-1 rounded hover:bg-zinc-50/80 transition-colors">
      <div className="flex items-center gap-2 w-[128px] shrink-0 text-ui-sm text-zinc-500">
        <i className={`${icon} w-3.5 text-center text-zinc-400 text-[11px]`} />
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function ModalEdicionTarea({ tarea, onClose, onSave, listaPersonas, registrarNuevaPersona, marcasDisponibles, isSubmitting }) {
  const [info, setInfo] = useState(tarea.info || "");
  const [categoria, setCategoria] = useState(tarea.categoria || "");
  const [marca, setMarca] = useState(tarea.marca || "");
  const [prioridad, setPrioridad] = useState(normalizarPrioridad(tarea.prioridad));
  const [estado, setEstado] = useState(tarea.estado || "Pendiente");
  const [deadline, setDeadline] = useState(tarea.deadline || "");
  const [personas, setPersonas] = useState(tarea.personas || "");
  const [rawDetalles, setRawDetalles] = useState(tarea.detalles || "");

  const parsed = useMemo(() => parseDetalles(rawDetalles), [rawDetalles]);
  
  const [notes, setNotes] = useState(parsed.notes || parsed.notas);
  const [subtareas, setSubtareas] = useState(parsed.subtareas);
  const [nuevoSubtareaText, setNuevoSubtareaText] = useState("");

  const estadoVisual = useMemo(() => {
    return ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(estado)) || ESTADOS_MAPA[0];
  }, [estado]);

  const subtareasCompletadas = useMemo(() => subtareas.filter(s => s.completed).length, [subtareas]);
  const subtareasProgreso = subtareas.length > 0 ? (subtareasCompletadas / subtareas.length) * 100 : 0;

  const handleAddSubtarea = (e) => {
    e.preventDefault();
    if (!nuevoSubtareaText.trim()) return;
    const nuevas = [...subtareas, { text: nuevoSubtareaText.trim(), completed: false }];
    setSubtareas(nuevas);
    setNuevoSubtareaText("");
    setRawDetalles(serializeDetalles(notes, nuevas, parsed.historial));
  };

  const handleToggleSubtarea = (index) => {
    const nuevas = [...subtareas];
    nuevas[index].completed = !nuevas[index].completed;
    setSubtareas(nuevas);
    setRawDetalles(serializeDetalles(notes, nuevas, parsed.historial));
  };

  const handleDeleteSubtarea = (index) => {
    const nuevas = subtareas.filter((_, i) => i !== index);
    setSubtareas(nuevas);
    setRawDetalles(serializeDetalles(notes, nuevas, parsed.historial));
  };

  const handleNotasChange = (newNotas) => {
    setNotes(newNotas);
    setRawDetalles(serializeDetalles(newNotas, subtareas, parsed.historial));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tFinal = serializeDetalles(notes, subtareas, parsed.historial);
    onSave({
      ...tarea,
      info: info.trim(),
      categoria: categoria.trim(),
      marca, prioridad: normalizarPrioridad(prioridad), estado, deadline, personas,
      detalles: tFinal
    });
  };

  const inputPropClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none cursor-pointer font-medium";
  const inputPropTextClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none font-medium placeholder-zinc-400";

  return (
    <div className="task-sheet-overlay fixed inset-0 z-[150] flex flex-col">
      <button
        type="button"
        onClick={onClose}
        className="task-sheet-backdrop flex-shrink-0 h-12 md:h-14 w-full bg-black/25 backdrop-blur-[1px] cursor-pointer transition-colors hover:bg-black/30"
        aria-label="Cerrar entregable"
      />

      <div className="task-sheet-panel flex-1 min-h-0 bg-white rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-y-auto animate-task-sheet-in">
        <form onSubmit={handleSubmit} className="min-h-full flex flex-col">
          <div className="sticky top-0 z-10 relative bg-white/95 backdrop-blur-sm pt-3 pb-1 px-6 md:px-10">
            <div className="task-sheet-handle w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-4" aria-hidden="true" />
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
              className="w-full pr-8 text-2xl md:text-[1.75rem] font-bold text-[#37352F] bg-transparent border-0 focus:outline-none placeholder-zinc-300 leading-snug"
            />
            {cleanIdTarea(tarea.idTarea) && (
              <span className="inline-block mt-1.5 text-[11px] font-mono text-zinc-400">
                {cleanIdTarea(tarea.idTarea)}
              </span>
            )}
          </div>

          <div className="flex-1 max-w-3xl mx-auto w-full px-6 md:px-10 pb-24">
          {/* Propiedades lineales */}
          <div className="pb-2 flex flex-col gap-0.5 border-b border-zinc-100">
            <PropertyRow icon="fa-regular fa-building" label="Cliente">
              <select value={marca} onChange={(e) => setMarca(e.target.value)} className={inputPropClass}>
                {marcasDisponibles.map(m => (
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
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Sin categoría"
                className={inputPropTextClass}
              />
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-calendar" label="Entrega">
              <input
                type="date"
                required
                value={convertirFechaAInput(deadline)}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputPropClass}
              />
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

          {/* Notas */}
          <div className="py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2 mb-2 text-ui-sm text-zinc-500">
              <i className="fa-regular fa-note-sticky text-zinc-400 text-[11px]" />
              <span>Notas</span>
            </div>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => handleNotasChange(e.target.value)}
              className="w-full bg-transparent border-0 p-0 text-ui-sm leading-relaxed text-[#37352F] focus:outline-none placeholder-zinc-400 resize-none"
              placeholder="Escribe notas o contexto adicional..."
            />
          </div>

          {/* Subtareas estilo Notion */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-ui-sm text-zinc-500">
                <i className="fa-regular fa-square-check text-zinc-400 text-[11px]" />
                <span>Subtareas</span>
              </div>
              {subtareas.length > 0 && (
                <span className="text-[11px] text-zinc-400 tabular-nums">
                  {subtareasCompletadas}/{subtareas.length}
                </span>
              )}
            </div>

            {subtareas.length > 0 && (
              <div className="h-0.5 bg-zinc-100 rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${subtareasProgreso}%` }}
                />
              </div>
            )}

            <div className="flex flex-col">
              {subtareas.map((s, idx) => (
                <div
                  key={idx}
                  className="group flex items-start gap-2.5 py-1 px-1 -mx-1 rounded hover:bg-zinc-50/80 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtarea(idx)}
                    className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                      s.completed
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-zinc-300 hover:border-zinc-500 bg-white"
                    }`}
                    aria-label={s.completed ? "Marcar pendiente" : "Marcar completada"}
                  >
                    {s.completed && <i className="fa-solid fa-check text-[8px]" />}
                  </button>
                  <span className={`flex-1 text-ui-sm leading-relaxed pt-px ${
                    s.completed ? "line-through text-zinc-400" : "text-[#37352F]"
                  }`}>
                    {s.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtarea(idx)}
                    className="opacity-0 group-hover:opacity-100 mt-0.5 w-5 h-5 flex items-center justify-center rounded text-zinc-300 hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
                    aria-label="Eliminar subtarea"
                  >
                    <i className="fa-solid fa-xmark text-[10px]" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2.5 py-1 px-1 -mx-1 mt-0.5">
                <div className="w-4 h-4 shrink-0 rounded border border-dashed border-zinc-300" />
                <input
                  type="text"
                  placeholder="Añadir subtarea..."
                  value={nuevoSubtareaText}
                  onChange={(e) => setNuevoSubtareaText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtarea(e); }}
                  className="flex-1 bg-transparent border-0 text-ui-sm text-[#37352F] placeholder-zinc-400 focus:outline-none"
                />
              </div>
            </div>
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

          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-zinc-100 px-6 md:px-10 py-3 flex justify-end gap-2 max-w-3xl mx-auto w-full">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-ui-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#37352F] text-white text-ui-sm font-medium rounded hover:bg-[#2c2a26] disabled:opacity-50 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
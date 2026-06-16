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

function FormularioCrearEntregable({
  nuevaTarea,
  setNuevaTarea,
  onSubmit,
  onCancel,
  marcasDisponibles,
  listaPersonas,
  registrarNuevaPersona,
  isSubmitting,
  syncing
}) {
  const [subtareas, setSubtareas] = useState([]);
  const [nuevoSubtareaText, setNuevoSubtareaText] = useState("");

  const estadoVisual = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(nuevaTarea.estado)) || ESTADOS_MAPA[0];
  const inputPropClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none cursor-pointer font-medium";
  const inputPropTextClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none font-medium placeholder-zinc-400";

  const subtareasCompletadas = useMemo(() => subtareas.filter(s => s.completed).length, [subtareas]);
  const subtareasProgreso = subtareas.length > 0 ? (subtareasCompletadas / subtareas.length) * 100 : 0;

  const handleAddSubtarea = (e) => {
    e.preventDefault();
    if (!nuevoSubtareaText.trim()) return;
    setSubtareas(prev => [...prev, { text: nuevoSubtareaText.trim(), completed: false }]);
    setNuevoSubtareaText("");
  };

  const handleToggleSubtarea = (index) => {
    setSubtareas(prev => prev.map((s, i) => i === index ? { ...s, completed: !s.completed } : s));
  };

  const handleDeleteSubtarea = (index) => {
    setSubtareas(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const detallesFinal = serializeDetalles(nuevaTarea.detalles, subtareas, []);
    onSubmit(e, detallesFinal);
  };

  return (
    <div className="task-form-page w-full min-h-full flex flex-col animate-fade-in bg-white">
      <form onSubmit={handleSubmit} className="min-h-full flex flex-col flex-1">
        <div className="px-5 md:px-12 lg:px-10 pt-1 pb-5 md:pt-6 md:pb-6">
          <span className="task-form-eyebrow text-ui-sm text-zinc-400">Nuevo entregable</span>
          <input
            type="text"
            required
            autoFocus
            value={nuevaTarea.info}
            onChange={(e) => setNuevaTarea({ ...nuevaTarea, info: e.target.value })}
            placeholder="Sin título"
            className="task-form-title w-full mt-2 text-2xl md:text-[1.75rem] font-bold text-[#37352F] bg-transparent border-0 focus:outline-none placeholder-zinc-300 leading-snug"
          />
        </div>

        <div className="flex-1 px-5 md:px-12 lg:px-10 pb-28">
          <div className="pb-2 flex flex-col gap-0.5 border-b border-zinc-100">
            <PropertyRow icon="fa-regular fa-building" label="Cliente">
              <select
                value={nuevaTarea.marca}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, marca: e.target.value })}
                className={inputPropClass}
              >
                {marcasDisponibles.map(m => (
                  <option key={m} value={m}>{formatearMarca(m)}</option>
                ))}
              </select>
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-circle-dot" label="Estado">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${estadoVisual.dot}`} />
                <select
                  value={nuevaTarea.estado}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, estado: e.target.value })}
                  className={inputPropClass}
                >
                  {LISTA_ESTADOS_VALIDOS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </PropertyRow>

            <PropertyRow icon="fa-solid fa-signal" label="Prioridad">
              <select
                value={nuevaTarea.prioridad}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, prioridad: e.target.value })}
                className={inputPropClass}
              >
                {PRIORIDADES_MAPA.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-folder" label="Categoría">
              <input
                type="text"
                value={nuevaTarea.categoria}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, categoria: e.target.value })}
                placeholder="Sin categoría"
                className={inputPropTextClass}
              />
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-calendar" label="Entrega">
              <InputFechaLibre
                value={nuevaTarea.deadline}
                onChange={(val) => setNuevaTarea({ ...nuevaTarea, deadline: val })}
                className={inputPropClass}
                required
              />
            </PropertyRow>

            <PropertyRow icon="fa-regular fa-user" label="Asignados">
              <SelectorPersonasChips
                personasSeleccionadas={nuevaTarea.personas}
                onChange={(val) => setNuevaTarea({ ...nuevaTarea, personas: val })}
                listaGlobal={listaPersonas}
                registrarNuevaPersona={registrarNuevaPersona}
                variant="minimal"
              />
            </PropertyRow>
          </div>

          <div className="py-4 border-b border-zinc-100">
            <div className="task-section-label flex items-center gap-2 mb-2 text-ui-sm text-zinc-500">
              <i className="fa-regular fa-note-sticky text-zinc-400 text-[11px]" />
              <span>Notas</span>
            </div>
            <EditorNotasRich
              value={nuevaTarea.detalles}
              onChange={(html) => setNuevaTarea({ ...nuevaTarea, detalles: html })}
            />
          </div>

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
                  <span className={`task-subtask-text flex-1 text-ui-sm leading-relaxed pt-px ${
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
                  className="task-subtask-input flex-1 bg-transparent border-0 text-ui-sm text-[#37352F] placeholder-zinc-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="task-form-actions sticky bottom-[var(--mobile-chrome-bottom,4rem)] md:bottom-0 bg-white/95 backdrop-blur-sm border-t border-zinc-100 px-5 md:px-12 lg:px-10 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-ui-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || syncing}
            className="px-4 py-1.5 bg-[#37352F] text-white text-ui-sm font-medium rounded hover:bg-[#2c2a26] disabled:opacity-50 transition-colors"
          >
            Crear entregable
          </button>
        </div>
      </form>
    </div>
  );
}

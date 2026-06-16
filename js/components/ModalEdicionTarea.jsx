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

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-md border border-zinc-300 shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto animate-zoom-in">
        <div className="flex items-center justify-between border-b pb-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded border">
              {cleanIdTarea(tarea.idTarea) || "ID AUTOMÁTICO"}
            </span>
            <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Entregable</span>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-800 text-lg font-bold"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Título del entregable</label>
              <input 
                type="text" 
                required
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Categoría</label>
              <input 
                type="text" 
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cliente</label>
              <select 
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F] bg-white"
              >
                {marcasDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Prioridad</label>
              <select 
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F] bg-white"
              >
                {PRIORIDADES_MAPA.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Estado</label>
              <select 
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F] bg-white"
              >
                {LISTA_ESTADOS_VALIDOS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fecha de Entrega</label>
              <input 
                type="date" 
                required
                value={convertirFechaAInput(deadline)}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs rounded focus:outline-none font-semibold text-[#37352F]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Miembros Asignados</label>
              <SelectorPersonasChips 
                personasSeleccionadas={personas}
                onChange={setPersonas}
                listaGlobal={listaPersonas}
                registrarNuevaPersona={registrarNuevaPersona}
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Notas generales</label>
            <textarea 
              rows="3"
              value={notes}
              onChange={(e) => handleNotasChange(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-2.5 text-xs rounded focus:outline-none font-medium text-[#37352F]"
              placeholder="Especificaciones o comentarios de apoyo..."
            />
          </div>

          {/* Checklist de Subtareas */}
          <div className="border-t pt-3 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subtareas / Checklist</span>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              {subtareas.length === 0 ? (
                <span className="text-xs text-zinc-400 italic">Ninguna subtarea registrada</span>
              ) : (
                subtareas.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-[#FAF9F6]/40 border border-zinc-150">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer flex-1">
                      <input 
                        type="checkbox" 
                        checked={s.completed} 
                        onChange={() => handleToggleSubtarea(idx)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                      />
                      <span className={s.completed ? "line-through text-zinc-400 font-normal" : "font-semibold text-zinc-700"}>{s.text}</span>
                    </label>
                    <button 
                      type="button"
                      onClick={() => handleDeleteSubtarea(idx)}
                      className="text-zinc-400 hover:text-red-500 transition-colors px-1"
                    >
                      <i className="fa-regular fa-trash-can text-[11px]"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nueva subtarea..."
                value={nuevoSubtareaText}
                onChange={(e) => setNuevoSubtareaText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtarea(e); }}
                className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs rounded focus:outline-none font-medium text-[#37352F]"
              />
              <button 
                type="button"
                onClick={handleAddSubtarea}
                className="bg-[#37352F] hover:bg-[#2c2a26] text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors"
              >
                Añadir
              </button>
            </div>
          </div>

          {parsed.historial && parsed.historial.length > 0 && (
            <div className="border-t pt-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Bitácora de Cambios</span>
              <div className="bg-zinc-50 p-2 rounded border border-zinc-200 max-h-24 overflow-y-auto flex flex-col gap-1">
                {parsed.historial.map((line, idx) => (
                  <p key={idx} className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t mt-1">
            <button 
              type="button" 
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#37352F] text-white text-xs font-semibold rounded hover:bg-[#2c2a26] disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL: APP
// =========================================================================

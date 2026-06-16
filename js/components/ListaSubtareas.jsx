function ListaSubtareas({ subtareas, onChange }) {
  const [nuevoSubtareaText, setNuevoSubtareaText] = useState("");

  const subtareasCompletadas = useMemo(() => subtareas.filter(s => s.completed).length, [subtareas]);
  const subtareasProgreso = subtareas.length > 0 ? (subtareasCompletadas / subtareas.length) * 100 : 0;

  const handleAddSubtarea = (e) => {
    e.preventDefault();
    if (!nuevoSubtareaText.trim()) return;
    onChange([...subtareas, { text: nuevoSubtareaText.trim(), completed: false }]);
    setNuevoSubtareaText("");
  };

  const handleToggleSubtarea = (index) => {
    onChange(subtareas.map((s, i) => i === index ? { ...s, completed: !s.completed } : s));
  };

  const handleEditSubtarea = (index, text) => {
    onChange(subtareas.map((s, i) => i === index ? { ...s, text } : s));
  };

  const handleBlurSubtarea = (index, text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange(subtareas.filter((_, i) => i !== index));
      return;
    }
    if (trimmed !== subtareas[index].text) {
      onChange(subtareas.map((s, i) => i === index ? { ...s, text: trimmed } : s));
    }
  };

  const handleDeleteSubtarea = (index) => {
    onChange(subtareas.filter((_, i) => i !== index));
  };

  return (
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
            <input
              type="text"
              value={s.text}
              onChange={(e) => handleEditSubtarea(idx, e.target.value)}
              onBlur={(e) => handleBlurSubtarea(idx, e.target.value)}
              className={`task-subtask-input flex-1 bg-transparent border-0 text-ui-sm leading-relaxed pt-px focus:outline-none ${
                s.completed ? "line-through text-zinc-400" : "text-[#37352F]"
              }`}
            />
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
  );
}

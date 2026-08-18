function ListaSubtareas({ subtareas, onChange }) {
  const lista = Array.isArray(subtareas) ? subtareas : [];
  const [nuevoSubtareaText, setNuevoSubtareaText] = useState("");
  const [completadasAbiertas, setCompletadasAbiertas] = useState(false);

  const subtareasCompletadas = useMemo(() => lista.filter(s => s.completed).length, [lista]);
  const subtareasProgreso = lista.length > 0 ? (subtareasCompletadas / lista.length) * 100 : 0;

  const { pendientes, completadas } = useMemo(() => {
    const pend = [];
    const comp = [];
    lista.forEach((s, index) => {
      const item = { ...s, index };
      if (s.completed) comp.push(item);
      else pend.push(item);
    });
    return { pendientes: pend, completadas: comp };
  }, [lista]);

  const handleAddSubtarea = (e) => {
    e.preventDefault();
    if (!nuevoSubtareaText.trim()) return;
    onChange([...lista, { text: nuevoSubtareaText.trim(), completed: false }]);
    setNuevoSubtareaText("");
  };

  const handleToggleSubtarea = (index) => {
    onChange(lista.map((s, i) => i === index ? { ...s, completed: !s.completed } : s));
  };

  const handleEditSubtarea = (index, text) => {
    onChange(lista.map((s, i) => i === index ? { ...s, text } : s));
  };

  const handleBlurSubtarea = (index, text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange(lista.filter((_, i) => i !== index));
      return;
    }
    if (trimmed !== lista[index].text) {
      onChange(lista.map((s, i) => i === index ? { ...s, text: trimmed } : s));
    }
  };

  const handleDeleteSubtarea = (index) => {
    onChange(lista.filter((_, i) => i !== index));
  };

  const renderSubtarea = (s, { secundaria = false } = {}) => (
    <div
      key={s.index}
      className={`group flex items-start gap-2.5 py-1 px-1 -mx-1 rounded hover:bg-zinc-50/80 transition-colors${
        secundaria ? " task-subtask-row--done" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => handleToggleSubtarea(s.index)}
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
        onChange={(e) => handleEditSubtarea(s.index, e.target.value)}
        onBlur={(e) => handleBlurSubtarea(s.index, e.target.value)}
        className={`task-subtask-input flex-1 bg-transparent border-0 text-ui-sm leading-relaxed pt-px focus:outline-none ${
          s.completed ? "line-through text-zinc-400" : "text-[#37352F]"
        }`}
      />
      <button
        type="button"
        onClick={() => handleDeleteSubtarea(s.index)}
        className="opacity-0 group-hover:opacity-100 mt-0.5 w-5 h-5 flex items-center justify-center rounded text-zinc-300 hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
        aria-label="Eliminar subtarea"
      >
        <i className="fa-solid fa-xmark text-[10px]" />
      </button>
    </div>
  );

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-ui-sm text-zinc-500">
          <i className="fa-regular fa-square-check text-zinc-400 text-[11px]" />
          <span>Subtareas</span>
        </div>
        {lista.length > 0 && (
          <span className="text-[11px] text-zinc-400 tabular-nums">
            {subtareasCompletadas}/{lista.length}
          </span>
        )}
      </div>

      {lista.length > 0 && (
        <div className="h-0.5 bg-zinc-100 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${subtareasProgreso}%` }}
          />
        </div>
      )}

      <div className="flex flex-col">
        {pendientes.map((s) => renderSubtarea(s))}

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

        {completadas.length > 0 && (
          <div className="task-subtasks-done mt-1.5">
            <button
              type="button"
              className="task-subtasks-done-toggle"
              aria-expanded={completadasAbiertas}
              onClick={() => setCompletadasAbiertas((abierto) => !abierto)}
            >
              <span>
                Completadas
                <span className="task-subtasks-done-toggle__count">{completadas.length}</span>
              </span>
              <i
                className={`fa-solid fa-chevron-down task-subtasks-done-toggle__chevron${completadasAbiertas ? " is-open" : ""}`}
                aria-hidden="true"
              />
            </button>
            {completadasAbiertas && (
              <div className="task-subtasks-done-panel">
                {completadas.map((s) => renderSubtarea(s, { secundaria: true }))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

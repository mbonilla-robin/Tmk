function LayoutKanban({ tareas, onUpdateField, onSelectTask, onDeleteTask, getMarcaStyle, currentTheme, ordenPrioridad = null }) {
  const [dragOverCol, setDragOverColumn] = useState(null);

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("taskId", task.idTarea || "");
    e.dataTransfer.setData("taskInfo", task.info || "");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e, targetEstado) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("taskId");
    const taskInfo = e.dataTransfer.getData("taskInfo");

    const taskMatched = tareas.find(t => (t.idTarea === taskId && taskId) || t.info === taskInfo);
    if (taskMatched && cleanEstado(taskMatched.estado) !== cleanEstado(targetEstado)) {
      onUpdateField(taskMatched, "estado", targetEstado);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start h-full animate-fade-in">
      {ESTADOS_MAPA.map(col => {
        let tareasColumna = tareas.filter(t => cleanEstado(t.estado) === cleanEstado(col.id));
        if (ordenPrioridad) {
          tareasColumna = [...tareasColumna].sort((a, b) => {
            const pesoA = getPriorityWeight(a.prioridad);
            const pesoB = getPriorityWeight(b.prioridad);
            const diff = ordenPrioridad === "desc" ? pesoB - pesoA : pesoA - pesoB;
            if (diff !== 0) return diff;
            return (a.info || "").localeCompare(b.info || "", "es");
          });
        }
        const isOverThis = dragOverCol === col.id;
        
        return (
          <div 
            key={col.id} 
            onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.id); }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`p-2 rounded-md flex flex-col gap-2 min-h-[400px] transition-all ${
              isOverThis ? 'bg-zinc-100/60' : 'bg-transparent'
            }`}
          >
            <div className="flex items-center justify-between pb-1 px-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-tight">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                <span>{col.id}</span>
              </div>
              <span className="text-zinc-400 font-normal">{tareasColumna.length}</span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-1">
              {tareasColumna.map(t => {
                const cMarca = getMarcaStyle(t.marca);
                const cPrioridad = PRIORIDADES_MAPA.find(p => cleanPrioridad(p.id) === cleanPrioridad(t.prioridad)) || PRIORIDADES_MAPA[1];
                
                const avanzarEstado = (e) => {
                  e.stopPropagation();
                  const index = ESTADOS_MAPA.findIndex(e => cleanEstado(e.id) === cleanEstado(t.estado));
                  const nextIndex = (index + 1) % ESTADOS_MAPA.length;
                  onUpdateField(t, "estado", ESTADOS_MAPA[nextIndex].id);
                };

                return (
                  <div 
                    key={t.idTarea + t.info}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, t)}
                    onClick={() => onSelectTask(t)}
                    className={`bg-white p-3 rounded border border-l-[3px] ${currentTheme.border} shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-sm cursor-grab active:cursor-grabbing transition-all flex flex-col gap-2 animate-fade-in`}
                    style={{ borderLeftColor: cMarca.accent }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${cMarca.surface}`}>
                        {formatearMarca(t.marca)}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-normal">
                        {t.deadline ? formatearFecha(t.deadline) : ""}
                      </span>
                    </div>

                    <h4 className="text-[12px] font-medium leading-snug text-[#37352F] line-clamp-3">{t.info}</h4>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100">
                      <span className="truncate max-w-[80px] font-medium">{t.personas || "Sin asignar"}</span>
                      <span className={`px-1.5 py-0.25 rounded border text-[9px] font-medium ${cPrioridad.color}`}>
                        {cPrioridad.label}
                      </span>
                    </div>

                    <div className="flex gap-1.5 mt-1">
                      <button 
                        onClick={avanzarEstado}
                        className="flex-1 py-1 text-center bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-[10px] font-medium rounded border border-zinc-200 transition-colors"
                      >
                        Avanzar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(t); }}
                        className="p-1 text-zinc-300 hover:text-red-500 rounded transition-colors"
                      >
                        <i className="fa-regular fa-trash-can text-[11px]"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =========================================================================
// 👤 COMPONENTE: SELECTOR DE PERSONAS CHIPS (NOTION STYLE)
// =========================================================================

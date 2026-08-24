function LayoutKanban({ tareas, onUpdateField, onSelectTask, onDeleteTask, getMarcaStyle, ordenPrioridad = null }) {
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
    if (taskMatched && onUpdateField && cleanEstado(taskMatched.estado) !== cleanEstado(targetEstado)) {
      onUpdateField(taskMatched, "estado", targetEstado);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start h-full animate-fade-in">
      {obtenerEstadosKanban().map(col => {
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
            className={`kanban-col ${isOverThis ? "is-drag-over" : ""}`}
          >
            <div className="kanban-col-head">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                <span>{col.id}</span>
              </div>
              <span className="kanban-col-count">{tareasColumna.length}</span>
            </div>

            <div className="kanban-col-body">
              {tareasColumna.map(t => {
                const cMarca = getMarcaStyle(t.marca);
                const cPrioridad = PRIORIDADES_MAPA.find(p => cleanPrioridad(p.id) === cleanPrioridad(t.prioridad)) || PRIORIDADES_MAPA[1];
                
                const avanzarEstado = (e) => {
                  e.stopPropagation();
                  if (!onUpdateField) return;
                  const index = obtenerEstadosKanban().findIndex(e => cleanEstado(e.id) === cleanEstado(t.estado));
                  const columnas = obtenerEstadosKanban();
                  const nextIndex = (index + 1) % columnas.length;
                  onUpdateField(t, "estado", columnas[nextIndex].id);
                };

                return (
                  <div 
                    key={t.idTarea + t.info}
                    draggable={!!onUpdateField}
                    onDragStart={(e) => handleDragStart(e, t)}
                    onClick={() => onSelectTask(t)}
                    className="kanban-card animate-fade-in"
                    style={{ borderLeftColor: cMarca.accent }}
                  >
                    <div className="kanban-card-top">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${cMarca.surface}`}>
                        {formatearMarca(t.marca)}
                      </span>
                      <span className="kanban-card-deadline">
                        {t.deadline ? formatearFecha(t.deadline) : ""}
                      </span>
                    </div>

                    <h4 className="kanban-card-title">{t.info}</h4>
                    {(() => {
                      const sub = typeof obtenerSubclienteTarea === "function"
                        ? obtenerSubclienteTarea(t)
                        : String(t.subcliente || "").trim();
                      if (!sub) return null;
                      return (
                        <p className="kanban-card-subcliente">
                          <i className="fa-solid fa-store" aria-hidden="true" />
                          <span>{sub}</span>
                        </p>
                      );
                    })()}

                    <div className="kanban-card-footer">
                      <span className="kanban-card-person">{t.personas || "Sin asignar"}</span>
                      <span className={`px-1.5 py-0.25 rounded border text-[9px] font-medium ${cPrioridad.color}`}>
                        {cPrioridad.label}
                      </span>
                    </div>

                    {onUpdateField && (
                    <div className="kanban-card-actions">
                      <button 
                        type="button"
                        onClick={avanzarEstado}
                        className="kanban-card-btn"
                      >
                        Avanzar
                      </button>
                      {onDeleteTask && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(t); }}
                        className="kanban-card-delete"
                        aria-label="Eliminar entregable"
                      >
                        <i className="fa-regular fa-trash-can text-[11px]"></i>
                      </button>
                      )}
                    </div>
                    )}
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

function LayoutTablaAgrupada({ tareas, onUpdateField, onSelectTask, onDeleteTask, getMarcaStyle, currentTheme }) {
  
  const tareasAgrupadasPorMarca = useMemo(() => {
    const agrupamiento = {};
    tareas.forEach(t => {
      const marcaKey = formatearMarca(t.marca) || "Otros";
      if (!agrupamiento[marcaKey]) agrupamiento[marcaKey] = [];
      agrupamiento[marcaKey].push(t);
    });

    const PRIORIDADES_ESTADOS = {
      "pendiente": 1, "en progreso": 2, "seguimiento": 3, "en revision": 4, "en pausa": 5, "completada": 99
    };

    Object.keys(agrupamiento).forEach(marca => {
      agrupamiento[marca].sort((a, b) => {
        const pesoA = getPriorityWeight(a.prioridad);
        const pesoB = getPriorityWeight(b.prioridad);
        if (pesoA !== pesoB) return pesoB - pesoA;
        const estA = cleanEstado(a.estado);
        const estB = cleanEstado(b.estado);
        return (PRIORIDADES_ESTADOS[estA] || 50) - (PRIORIDADES_ESTADOS[estB] || 50);
      });
    });

    return agrupamiento;
  }, [tareas]);

  return (
    <div className={`border ${currentTheme.border} rounded-md overflow-hidden ${currentTheme.cardBg} w-full`}>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#FAF9F6]/80 border-b border-zinc-200 text-zinc-500 font-medium">
              <th className="py-2.5 px-4 text-center w-24">ID</th>
              <th className="py-2.5 px-4 w-24 text-center">Prioridad</th>
              <th className="py-2.5 px-4 w-28">Categoría</th>
              <th className="py-2.5 px-4">Entregable</th>
              <th className="py-2.5 px-4 w-32 text-center">Estado</th>
              <th className="py-2.5 px-4 w-28 text-center">Fecha Límite</th>
              <th className="py-2.5 px-4 w-32">Asignado</th>
              <th className="py-2.5 px-4 text-center w-16">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tareas.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-zinc-400 font-normal">
                  No hay entregables registrados en esta pestaña.
                </td>
              </tr>
            ) : (
              Object.keys(tareasAgrupadasPorMarca).map(marca => {
                const tareasDeMarca = tareasAgrupadasPorMarca[marca];
                const badgeStyle = getMarcaStyle(marca);

                return (
                  <React.Fragment key={marca}>
                    <tr className="bg-[#FAF9F6]/40 border-y border-zinc-200/50">
                      <td colSpan="8" className="py-1.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                            {formatearMarca(marca)}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-medium">
                            ({tareasDeMarca.length})
                          </span>
                        </div>
                      </td>
                    </tr>

                    {tareasDeMarca.map(t => {
                      const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { color: "text-zinc-600", dot: "bg-[#7c7c7c]", bg: "bg-zinc-50" };
                      const cPrioridad = PRIORIDADES_MAPA.find(p => cleanPrioridad(p.id) === cleanPrioridad(t.prioridad)) || PRIORIDADES_MAPA[1];
                      const displayId = cleanIdTarea(t.idTarea);
                      
                      return (
                        <tr 
                          key={t.idTarea + t.info} 
                          onClick={() => onSelectTask(t)}
                          className="hover:bg-zinc-50/60 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400 text-center font-medium">
                            {displayId || "---"}
                          </td>

                          <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={t.prioridad || "Media"}
                              onChange={(e) => onUpdateField(t, "prioridad", e.target.value)}
                              className={`text-[11px] font-medium px-2 py-0.5 rounded border focus:outline-none focus:ring-0 ${cPrioridad.color} cursor-pointer`}
                            >
                              {PRIORIDADES_MAPA.map(p => (
                                <option key={p.id} value={p.id} className="bg-white text-[#37352F]">
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          
                          <td className="py-2.5 px-4 text-zinc-500 font-normal truncate max-w-[120px]">
                            {t.categoria || "---"}
                          </td>

                          <td className="py-2.5 px-4 font-medium text-[#37352F]">
                            <div className="max-w-md">
                              <p className="truncate leading-relaxed">{t.info}</p>
                              {t.detalles && (
                                <p className="text-[10px] text-zinc-400 font-normal truncate mt-0.5">
                                  {t.detalles.split('\n')[0]}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-center">
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-150 ${cEstado.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cEstado.dot}`}></span>
                                <select
                                  value={t.estado}
                                  onChange={(e) => onUpdateField(t, "estado", e.target.value)}
                                  className="text-[10px] font-medium bg-transparent border-0 cursor-pointer focus:outline-none focus:ring-0 text-zinc-700"
                                >
                                  {LISTA_ESTADOS_VALIDOS.map(opt => (
                                    <option key={opt} value={opt} className="bg-white text-zinc-800">
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="date"
                              value={convertirFechaAInput(t.deadline)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val && val.length === 10) {
                                  onUpdateField(t, "deadline", val);
                                }
                              }}
                              className="bg-transparent border-0 py-0.5 px-1 text-zinc-500 font-medium focus:outline-none w-28 text-center"
                            />
                          </td>

                          <td className="py-2.5 px-4 text-zinc-500 font-medium truncate max-w-[100px]">
                            {t.personas || "Sin asignar"}
                          </td>

                          <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onDeleteTask(t)}
                              className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                            >
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// 🗂️ COMPONENTE: LAYOUT KANBAN (BOARD KANBAN ESTILO NOTION)
// =========================================================================

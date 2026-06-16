function LayoutTablaAgrupada({
  tareas,
  onUpdateField,
  onSelectTask,
  onDeleteTask,
  getMarcaStyle,
  currentTheme,
  tareasSeleccionadas = new Set(),
  onToggleSeleccion = () => {},
  onToggleSeleccionGrupo = () => {}
}) {
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

  const grupoCompletamenteSeleccionado = (lista) =>
    lista.length > 0 && lista.every(t => tareasSeleccionadas.has(getTaskSelectionKey(t)));

  const grupoParcialmenteSeleccionado = (lista) =>
    lista.some(t => tareasSeleccionadas.has(getTaskSelectionKey(t))) && !grupoCompletamenteSeleccionado(lista);

  return (
    <>
      <div className="md:hidden mobile-task-list">
        {tareas.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 text-ui border border-zinc-200 rounded-md bg-white">
            No hay entregables registrados en esta pestaña.
          </div>
        ) : (
          Object.keys(tareasAgrupadasPorMarca).map(marca => {
            const tareasDeMarca = tareasAgrupadasPorMarca[marca];
            const badgeStyle = getMarcaStyle(marca);

            return (
              <div key={marca} className="mobile-brand-group">
                <div className={`mobile-brand-header ${badgeStyle.bg} ${badgeStyle.text} border ${badgeStyle.border}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={grupoCompletamenteSeleccionado(tareasDeMarca)}
                      ref={el => { if (el) el.indeterminate = grupoParcialmenteSeleccionado(tareasDeMarca); }}
                      onChange={() => onToggleSeleccionGrupo(tareasDeMarca, !grupoCompletamenteSeleccionado(tareasDeMarca))}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-zinc-300 text-zinc-800 shrink-0"
                      title="Seleccionar grupo"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-sm truncate block">{formatearMarca(marca)}</span>
                      <span className="text-[10px] opacity-75">{tareasDeMarca.length} entregable{tareasDeMarca.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>

                <div className="mobile-brand-body">
                {tareasDeMarca.map(t => {
                  const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400" };
                  const cPrioridad = PRIORIDADES_MAPA.find(p => cleanPrioridad(p.id) === cleanPrioridad(t.prioridad)) || PRIORIDADES_MAPA[1];
                  const selKey = getTaskSelectionKey(t);
                  const estaSeleccionada = tareasSeleccionadas.has(selKey);
                  const personasCorta = t.personas
                    ? t.personas.split(/[\s,]+/).filter(Boolean).slice(0, 2).join(", ")
                    : "—";

                  return (
                    <div
                      key={selKey}
                      onClick={() => onSelectTask(t)}
                      className={`mobile-task-card cursor-pointer ${estaSeleccionada ? "is-selected" : ""}`}
                    >
                      <div className="mobile-task-row-main">
                        <input
                          type="checkbox"
                          checked={estaSeleccionada}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => onToggleSeleccion(t)}
                          className="mobile-task-check"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="mobile-task-title">{t.info}</p>
                          <div className="mobile-task-details">
                            <span className="mobile-task-detail" title="Estado">
                              <span className={`mobile-task-dot ${cEstado.dot}`}></span>
                              <span className="truncate">{t.estado || "—"}</span>
                            </span>
                            <span className="mobile-task-detail" title="Fecha">
                              <SVGIcon.Calendar className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{t.deadline ? formatearFecha(t.deadline) : "—"}</span>
                            </span>
                            <span className="mobile-task-detail" title="Asignados">
                              <SVGIcon.Users className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{personasCorta}</span>
                            </span>
                            <span className={`mobile-task-priority ${cPrioridad.color}`} title="Prioridad" onClick={(e) => e.stopPropagation()}>
                              <SVGIcon.Flag className="w-2.5 h-2.5 shrink-0" />
                              <select
                                value={normalizarPrioridad(t.prioridad)}
                                onChange={(e) => onUpdateField(t, "prioridad", e.target.value)}
                                className={`mobile-task-priority-select ${cPrioridad.color}`}
                                aria-label="Cambiar prioridad"
                              >
                                {PRIORIDADES_MAPA.map(p => (
                                  <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                              </select>
                            </span>
                          </div>
                        </div>
                        <SVGIcon.ChevronRight className="w-3 h-3 text-zinc-300 shrink-0" />
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={`hidden md:block border ${currentTheme.border} rounded-md overflow-hidden ${currentTheme.cardBg} w-full`}>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-ui">
          <thead>
            <tr className="bg-[#FAF9F6]/80 border-b border-zinc-200 text-zinc-500">
              <th className="py-2 px-3 w-10 text-center">
                <span className="sr-only">Seleccionar</span>
              </th>
              <th className="py-2 px-3 text-ui-sm font-medium w-20">ID</th>
              <th className="py-2 px-3 w-24 text-center text-ui-sm font-medium">Prioridad</th>
              <th className="py-2 px-3 w-24 text-ui-sm font-medium">Categoría</th>
              <th className="py-2 px-3 text-ui-sm font-medium">Entregable</th>
              <th className="py-2 px-3 w-28 text-center text-ui-sm font-medium">Estado</th>
              <th className="py-2 px-3 w-28 text-center text-ui-sm font-medium">Fecha</th>
              <th className="py-2 px-3 w-28 text-ui-sm font-medium">Asignado</th>
              <th className="py-2 px-3 text-center w-12 text-ui-sm font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tareas.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-zinc-400">
                  No hay entregables registrados en esta pestaña.
                </td>
              </tr>
            ) : (
              Object.keys(tareasAgrupadasPorMarca).map(marca => {
                const tareasDeMarca = tareasAgrupadasPorMarca[marca];
                const badgeStyle = getMarcaStyle(marca);
                const todoGrupo = grupoCompletamenteSeleccionado(tareasDeMarca);
                const parcialGrupo = grupoParcialmenteSeleccionado(tareasDeMarca);

                return (
                  <React.Fragment key={marca}>
                    <tr className="bg-[#FAF9F6]/60 border-y border-zinc-200/50">
                      <td className="py-1.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={todoGrupo}
                          ref={el => { if (el) el.indeterminate = parcialGrupo; }}
                          onChange={() => onToggleSeleccionGrupo(tareasDeMarca, !todoGrupo)}
                          className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-400 cursor-pointer"
                          title="Seleccionar grupo"
                        />
                      </td>
                      <td colSpan="8" className="py-1.5 px-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-ui-sm font-semibold px-2 py-0.5 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                            {formatearMarca(marca)}
                          </span>
                          <span className="text-ui-sm text-zinc-400">
                            {tareasDeMarca.length}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {tareasDeMarca.map(t => {
                      const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { color: "text-zinc-600", dot: "bg-[#7c7c7c]", bg: "bg-zinc-50" };
                      const cPrioridad = PRIORIDADES_MAPA.find(p => cleanPrioridad(p.id) === cleanPrioridad(t.prioridad)) || PRIORIDADES_MAPA[1];
                      const displayId = cleanIdTarea(t.idTarea);
                      const selKey = getTaskSelectionKey(t);
                      const estaSeleccionada = tareasSeleccionadas.has(selKey);

                      return (
                        <tr
                          key={selKey}
                          onClick={() => onSelectTask(t)}
                          className={`transition-colors cursor-pointer ${
                            estaSeleccionada ? "bg-blue-50/50 hover:bg-blue-50/70" : "hover:bg-zinc-50/60"
                          }`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={estaSeleccionada}
                              onChange={() => onToggleSeleccion(t)}
                              className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-400 cursor-pointer"
                            />
                          </td>

                          <td className="py-2 px-3 font-mono text-ui-sm text-zinc-400">
                            {displayId || "—"}
                          </td>

                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={normalizarPrioridad(t.prioridad)}
                              onChange={(e) => onUpdateField(t, "prioridad", e.target.value)}
                              className={`text-ui-sm font-medium px-2 py-0.5 rounded border focus:outline-none focus:ring-0 ${cPrioridad.color} cursor-pointer bg-transparent`}
                            >
                              {PRIORIDADES_MAPA.map(p => (
                                <option key={p.id} value={p.id} className="bg-white text-[#37352F]">
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2 px-3 text-zinc-500 truncate max-w-[100px]">
                            {t.categoria || "—"}
                          </td>

                          <td className="py-2 px-3">
                            <p className="font-medium text-[#37352F] leading-snug line-clamp-2 max-w-lg">
                              {t.info}
                            </p>
                          </td>

                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-150 ${cEstado.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`}></span>
                              <select
                                value={t.estado}
                                onChange={(e) => onUpdateField(t, "estado", e.target.value)}
                                className="text-ui-sm font-medium bg-transparent border-0 cursor-pointer focus:outline-none focus:ring-0 text-zinc-700 max-w-[110px]"
                              >
                                {LISTA_ESTADOS_VALIDOS.map(opt => (
                                  <option key={opt} value={opt} className="bg-white text-zinc-800">
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="date"
                              value={convertirFechaAInput(t.deadline)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val && val.length === 10) {
                                  onUpdateField(t, "deadline", val);
                                }
                              }}
                              className="bg-transparent border-0 py-0.5 text-ui-sm text-zinc-500 focus:outline-none w-28 text-center"
                            />
                          </td>

                          <td className="py-2 px-3 text-zinc-500 truncate max-w-[100px]">
                            {t.personas || "Sin asignar"}
                          </td>

                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onDeleteTask(t)}
                              className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                              title="Eliminar"
                            >
                              <i className="fa-regular fa-trash-can text-ui-sm"></i>
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
    </>
  );
}

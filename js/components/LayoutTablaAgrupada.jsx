function NotionTaskRow({
  t,
  onSelectTask,
  onDeleteTask,
  onToggleSeleccion,
  estaSeleccionada
}) {
  const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "bg-zinc-50" };
  const cPrioridad = PRIORIDADES_MAPA.find(p => cleanPrioridad(p.id) === cleanPrioridad(t.prioridad)) || PRIORIDADES_MAPA[1];
  const personasCorta = t.personas
    ? t.personas.split(/[\s,]+/).filter(Boolean).slice(0, 2).join(", ")
    : null;

  return (
    <div
      onClick={() => onSelectTask(t)}
      className={`notion-task-row group ${estaSeleccionada ? "is-selected" : ""}`}
    >
      <input
        type="checkbox"
        checked={estaSeleccionada}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggleSeleccion(t)}
        className="notion-task-check"
        aria-label="Seleccionar entregable"
      />

      <div className="notion-task-body">
        <p className="notion-task-title">{t.info}</p>

        <div className="notion-task-meta">
          <span className={`notion-task-estado-pill ${cEstado.bg}`}>
            <span className={`notion-task-dot ${cEstado.dot}`} />
            {t.estado || "—"}
          </span>

          {t.deadline && (
            <span className="notion-task-meta-chip">
              <SVGIcon.Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
              {formatearFecha(t.deadline)}
            </span>
          )}

          {personasCorta && (
            <span className="notion-task-meta-chip">
              <SVGIcon.Users className="w-3 h-3 text-zinc-400 shrink-0" />
              {personasCorta}
            </span>
          )}

          {t.categoria && (
            <span className="notion-task-meta-chip notion-task-meta-cat">
              {t.categoria}
            </span>
          )}

          <span className={`notion-task-prio-tag ${cPrioridad.color}`}>
            {normalizarPrioridad(t.prioridad)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDeleteTask(t); }}
        className="notion-task-delete"
        title="Eliminar"
        aria-label="Eliminar entregable"
      >
        <i className="fa-regular fa-trash-can" />
      </button>
    </div>
  );
}

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

  if (tareas.length === 0) {
    return (
      <div className="notion-task-list-empty">
        No hay entregables registrados en esta vista.
      </div>
    );
  }

  return (
    <div className={`notion-task-list ${currentTheme.text}`}>
      {Object.keys(tareasAgrupadasPorMarca).sort((a, b) => a.localeCompare(b, "es")).map(marca => {
        const tareasDeMarca = tareasAgrupadasPorMarca[marca];
        const badgeStyle = getMarcaStyle(marca);
        const todoGrupo = grupoCompletamenteSeleccionado(tareasDeMarca);
        const parcialGrupo = grupoParcialmenteSeleccionado(tareasDeMarca);

        return (
          <section key={marca} className="notion-group">
            <header className={`notion-group-hero ${badgeStyle.bg} border ${badgeStyle.border}`}>
              <div className="notion-group-hero-row">
                <input
                  type="checkbox"
                  checked={todoGrupo}
                  ref={el => { if (el) el.indeterminate = parcialGrupo; }}
                  onChange={() => onToggleSeleccionGrupo(tareasDeMarca, !todoGrupo)}
                  onClick={(e) => e.stopPropagation()}
                  className="notion-task-check notion-group-check"
                  title="Seleccionar grupo"
                />
                <div className="notion-group-hero-text">
                  <h3 className={`notion-group-title ${badgeStyle.text}`}>
                    {formatearMarca(marca)}
                  </h3>
                  <p className="notion-group-subtitle">
                    {tareasDeMarca.length} entregable{tareasDeMarca.length !== 1 ? "s" : ""} activo{tareasDeMarca.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </header>

            <div className="notion-group-items">
              {tareasDeMarca.map(t => {
                const selKey = getTaskSelectionKey(t);
                return (
                  <NotionTaskRow
                    key={selKey}
                    t={t}
                    onSelectTask={onSelectTask}
                    onDeleteTask={onDeleteTask}
                    onToggleSeleccion={onToggleSeleccion}
                    estaSeleccionada={tareasSeleccionadas.has(selKey)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

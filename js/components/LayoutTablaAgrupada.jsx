function NotionTaskRow({
  t,
  onSelectTask,
  onDeleteTask,
  onToggleSeleccion,
  onSolicitarCompletar,
  estaSeleccionada,
  getMarcaStyle,
  listaCategorias = []
}) {
  const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400", bg: "bg-zinc-50" };
  const cPrioridad = PRIORIDADES_MAPA.find(p => cleanPrioridad(p.id) === cleanPrioridad(t.prioridad)) || PRIORIDADES_MAPA[1];
  const cMarca = getMarcaStyle ? getMarcaStyle(t.marca) : { surface: "marca-surface-otros", accent: "#71717A" };
  const personasCorta = t.personas
    ? t.personas.split(/[\s,]+/).filter(Boolean).slice(0, 2).join(", ")
    : null;
  const esCompletada = cleanEstado(t.estado) === "completada";
  const subtareasResumen = useMemo(() => resumirSubtareasTarea(t), [t.detalles]);
  const sinDisenador = useMemo(() => tareaSinDisenadorAsignado(t), [t.personas]);
  const cats = parseCategoriasTarea(t.categoria);

  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const bloquearClick = useRef(false);
  const offsetXRef = useRef(0);

  const SWIPE_THRESHOLD = 56;
  const MAX_SWIPE = 76;

  const resetSwipe = () => {
    offsetXRef.current = 0;
    setOffsetX(0);
    setSwiping(false);
  };

  const handleTouchStart = (e) => {
    if (esCompletada || !onSolicitarCompletar) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwiping(true);
    bloquearClick.current = false;
  };

  const handleTouchMove = (e) => {
    if (!swiping || esCompletada) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      setSwiping(false);
      setOffsetX(0);
      return;
    }
    if (deltaX > 8) bloquearClick.current = true;
    const next = Math.max(0, Math.min(deltaX, MAX_SWIPE));
    offsetXRef.current = next;
    setOffsetX(next);
  };

  const handleTouchEnd = () => {
    if (!swiping || esCompletada) return;
    setSwiping(false);
    if (offsetXRef.current >= SWIPE_THRESHOLD) {
      resetSwipe();
      onSolicitarCompletar(t);
      return;
    }
    offsetXRef.current = 0;
    setOffsetX(0);
  };

  const handleClick = () => {
    if (bloquearClick.current) {
      bloquearClick.current = false;
      return;
    }
    onSelectTask(t);
  };

  const rowContent = (
    <div
      onClick={handleClick}
      className={`notion-task-row group ${estaSeleccionada ? "is-selected" : ""} ${esCompletada ? "is-completed" : ""}`}
      style={{
        borderLeftColor: cMarca.accent,
        transform: offsetX ? `translateX(${offsetX}px)` : undefined,
        transition: swiping ? "none" : "transform 0.2s ease"
      }}
    >
      {onToggleSeleccion && (
      <input
        type="checkbox"
        checked={estaSeleccionada}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggleSeleccion(t)}
        className="notion-task-check"
        aria-label="Seleccionar entregable"
      />
      )}

      <div className="notion-task-body">
        <p className="notion-task-title">{t.info}</p>

        <div className="notion-task-meta">
          <span className={`notion-task-meta-chip border ${cMarca.surface}`}>
            {formatearMarca(t.marca)}
          </span>

          <span className={`notion-task-estado-pill ${cEstado.bg}`}>
            <span className={`notion-task-dot ${cEstado.dot}`} />
            {normalizarEstado(t.estado) || "—"}
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

          {cats.principal && (() => {
            const estilo = obtenerEstiloCategoriaPorNombre(cats.principal, listaCategorias);
            return (
              <span className={`notion-task-meta-chip border ${estilo.bg} ${estilo.text} ${estilo.border}`}>
                {cats.principal}
              </span>
            );
          })()}

          {cats.subcategorias.map((sub) => {
            const estilo = obtenerEstiloCategoriaPorNombre(sub, listaCategorias);
            return (
              <span key={sub} className={`notion-task-meta-chip border opacity-80 ${estilo.bg} ${estilo.text} ${estilo.border}`}>
                {sub}
              </span>
            );
          })}

          <span className={`notion-task-prio-tag ${cPrioridad.color}`}>
            {normalizarPrioridad(t.prioridad)}
          </span>

          {subtareasResumen.total > 0 && (
            <span className="notion-task-badge notion-task-badge--sub" title="Subtareas">
              <i className="fa-regular fa-square-check text-[9px]" aria-hidden="true" />
              {subtareasResumen.done}/{subtareasResumen.total}
            </span>
          )}

          {sinDisenador && !esCompletada && (
            <span className="notion-task-badge notion-task-badge--warn" title="Sin diseñador asignado">
              Sin diseñador
            </span>
          )}
        </div>
      </div>

      {onDeleteTask && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDeleteTask(t); }}
        className="notion-task-delete"
        title="Eliminar"
        aria-label="Eliminar entregable"
      >
        <i className="fa-regular fa-trash-can" />
      </button>
      )}
    </div>
  );

  if (!onSolicitarCompletar || esCompletada) {
    return rowContent;
  }

  return (
    <div
      className="notion-task-swipe-wrap md:contents"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetSwipe}
    >
      <div className="notion-task-swipe-action md:hidden" aria-hidden="true">
        <i className="fa-solid fa-check" />
        <span>Completar</span>
      </div>
      {rowContent}
    </div>
  );
}

function LayoutTablaAgrupada({
  tareas,
  onUpdateField,
  onSelectTask,
  onDeleteTask,
  onSolicitarCompletar,
  getMarcaStyle,
  currentTheme,
  modoAgrupacion = "estado",
  tareasSeleccionadas = new Set(),
  onToggleSeleccion = () => {},
  onToggleSeleccionGrupo = () => {},
  listaCategorias = []
}) {
  const tareasAgrupadasPorMarca = useMemo(
    () => agruparTareasPorMarcaOrdenadas(tareas, modoAgrupacion),
    [tareas, modoAgrupacion]
  );

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
      {Object.keys(tareasAgrupadasPorMarca).sort((a, b) => a.localeCompare(b, "es")).map((marca, marcaIndex) => {
        const tareasDeMarca = tareasAgrupadasPorMarca[marca];
        const badgeStyle = getMarcaStyle(marca);
        const todoGrupo = grupoCompletamenteSeleccionado(tareasDeMarca);
        const parcialGrupo = grupoParcialmenteSeleccionado(tareasDeMarca);

        return (
          <section key={marca} className="notion-group">
            <header
              className={`notion-group-header ${badgeStyle.surface}`}
              style={{ borderLeftColor: badgeStyle.accent }}
              data-induccion={onToggleSeleccion && marcaIndex === 0 ? "seleccion-masiva" : undefined}
            >
              <input
                type="checkbox"
                checked={todoGrupo}
                ref={el => { if (el) el.indeterminate = parcialGrupo; }}
                onChange={() => onToggleSeleccionGrupo(tareasDeMarca, !todoGrupo)}
                onClick={(e) => e.stopPropagation()}
                className="notion-task-check notion-group-check"
                title="Seleccionar grupo"
              />
              <h3 className="notion-group-title">
                {formatearMarca(marca)}
              </h3>
              <span className="notion-group-count" style={{ color: badgeStyle.accent }}>
                {tareasDeMarca.length}
              </span>
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
                    onSolicitarCompletar={onSolicitarCompletar}
                    onToggleSeleccion={onToggleSeleccion}
                    estaSeleccionada={tareasSeleccionadas.has(selKey)}
                    getMarcaStyle={getMarcaStyle}
                    listaCategorias={listaCategorias}
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

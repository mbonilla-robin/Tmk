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
  const esSuspendida = esTareaSuspendida(t);
  const subtareasResumen = useMemo(() => resumirSubtareasTarea(t), [t.detalles]);
  const sinDisenador = useMemo(() => tareaSinDisenadorAsignado(t), [t.personas]);
  const cats = parseCategoriasTarea(t.categoria);
  const subcliente = obtenerSubclienteTarea(t);

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
    if (esCompletada || esSuspendida || !onSolicitarCompletar) return;
    if (e.target.closest(".notion-task-check")) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    bloquearClick.current = false;
  };

  const handleTouchMove = (e) => {
    if (esCompletada || esSuspendida) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (!swiping) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) return;
      if (deltaX < 8) return;
      setSwiping(true);
    }
    if (deltaX > 8) bloquearClick.current = true;
    const next = Math.max(0, Math.min(deltaX, MAX_SWIPE));
    offsetXRef.current = next;
    setOffsetX(next);
  };

  const handleTouchEnd = () => {
    if (!swiping || esCompletada || esSuspendida) return;
    setSwiping(false);
    if (offsetXRef.current >= SWIPE_THRESHOLD) {
      resetSwipe();
      onSolicitarCompletar(t);
      return;
    }
    offsetXRef.current = 0;
    setOffsetX(0);
  };

  const handleTouchCancel = () => {
    resetSwipe();
    touchStartX.current = 0;
    touchStartY.current = 0;
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
      className={`notion-task-row group ${estaSeleccionada ? "is-selected" : ""} ${esCompletada ? "is-completed" : ""} ${esSuspendida ? "is-suspended" : ""}`}
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
        {subcliente ? (
          <p className="notion-task-subcliente">
            <i className="fa-solid fa-store" aria-hidden="true" />
            <span>{subcliente}</span>
          </p>
        ) : null}

        <div className="notion-task-meta">
          <span className={`notion-task-meta-chip border ${cMarca.surface}`}>
            {formatearMarca(t.marca)}
          </span>

          <span className={`notion-task-estado-pill ${cEstado.bg}`}>
            <span className={`notion-task-dot ${cEstado.dot}`} />
            {normalizarEstado(t.estado) || "—"}
          </span>

          {t.deadline && !esSuspendida && (
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

          {sinDisenador && !esCompletada && !esSuspendida && (
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

  if (!onSolicitarCompletar || esCompletada || esSuspendida) {
    return rowContent;
  }

  return (
    <div
      className="notion-task-swipe-wrap md:contents"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
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
  agruparPor = "marca",
  tareasSeleccionadas = new Set(),
  onToggleSeleccion = () => {},
  onToggleSeleccionGrupo = () => {},
  listaCategorias = [],
  onDuplicarSubcliente
}) {
  const tareasAgrupadas = useMemo(() => {
    if (agruparPor === "subcliente") {
      return agruparTareasPorSubclienteOrdenadas(tareas, modoAgrupacion);
    }
    return agruparTareasPorMarcaOrdenadas(tareas, modoAgrupacion);
  }, [tareas, modoAgrupacion, agruparPor]);

  const grupoCompletamenteSeleccionado = (lista) =>
    lista.length > 0 && lista.every(t => tareaEstaSeleccionada(t, tareasSeleccionadas));

  const grupoParcialmenteSeleccionado = (lista) =>
    lista.some(t => tareaEstaSeleccionada(t, tareasSeleccionadas)) && !grupoCompletamenteSeleccionado(lista);

  const gruposOrdenados = useMemo(() => {
    const keys = Object.keys(tareasAgrupadas);
    if (agruparPor !== "subcliente") {
      return keys.sort((a, b) => a.localeCompare(b, "es"));
    }
    return keys.sort((a, b) => {
      if (a === "Sin subcliente") return 1;
      if (b === "Sin subcliente") return -1;
      return a.localeCompare(b, "es");
    });
  }, [tareasAgrupadas, agruparPor]);

  if (tareas.length === 0) {
    return (
      <div className="notion-task-list-empty">
        No hay entregables registrados en esta vista.
      </div>
    );
  }

  return (
    <div className={`notion-task-list ${currentTheme.text}`}>
      {gruposOrdenados.map((grupoKey, grupoIndex) => {
        const tareasDeGrupo = tareasAgrupadas[grupoKey];
        const badgeStyle = agruparPor === "subcliente"
          ? { surface: "marca-surface-otros", accent: "#71717A" }
          : getMarcaStyle(grupoKey);
        const todoGrupo = grupoCompletamenteSeleccionado(tareasDeGrupo);
        const parcialGrupo = grupoParcialmenteSeleccionado(tareasDeGrupo);
        const tituloGrupo = agruparPor === "subcliente"
          ? grupoKey
          : formatearMarca(grupoKey);

        return (
          <section
            key={grupoKey}
            data-sub-clave={agruparPor === "subcliente" ? claveDomSubcliente(grupoKey) : undefined}
            className="notion-group"
          >
            <header
              className={`notion-group-header ${badgeStyle.surface}`}
              style={{ borderLeftColor: badgeStyle.accent }}
              data-induccion={onToggleSeleccion && grupoIndex === 0 ? "seleccion-masiva" : undefined}
            >
              <input
                type="checkbox"
                checked={todoGrupo}
                ref={el => { if (el) el.indeterminate = parcialGrupo; }}
                onChange={() => onToggleSeleccionGrupo(tareasDeGrupo, !todoGrupo)}
                onClick={(e) => e.stopPropagation()}
                className="notion-task-check notion-group-check"
                title="Seleccionar grupo"
              />
              <h3 className="notion-group-title">
                {agruparPor === "subcliente" && grupoKey !== "Sin subcliente" && (
                  <i className="fa-solid fa-store text-[11px] text-zinc-400 mr-1.5" aria-hidden="true" />
                )}
                {tituloGrupo}
              </h3>
              {agruparPor === "subcliente"
                && typeof onDuplicarSubcliente === "function"
                && (typeof grupoSubclientePermiteDuplicar === "function"
                  ? grupoSubclientePermiteDuplicar(grupoKey)
                  : grupoKey !== "Sin subcliente") && (
                <button
                  type="button"
                  className="subcliente-add-btn"
                  title="Nuevo entregable con la misma base"
                  aria-label={`Crear entregable en ${tituloGrupo}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const plantilla = typeof elegirPlantillaGrupo === "function"
                      ? elegirPlantillaGrupo(tareasDeGrupo)
                      : tareasDeGrupo[0];
                    onDuplicarSubcliente(plantilla || { subcliente: grupoKey });
                  }}
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              )}
              <span className="notion-group-count" style={{ color: badgeStyle.accent }}>
                {tareasDeGrupo.length}
              </span>
            </header>

            <div className="notion-group-items">
              {tareasDeGrupo.map(t => {
                const selKey = getTaskSelectionKey(t);
                return (
                  <NotionTaskRow
                    key={selKey}
                    t={t}
                    onSelectTask={onSelectTask}
                    onDeleteTask={onDeleteTask}
                    onSolicitarCompletar={onSolicitarCompletar}
                    onToggleSeleccion={onToggleSeleccion}
                    estaSeleccionada={tareaEstaSeleccionada(t, tareasSeleccionadas)}
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

function HomeUrgenteMobileCard({ tarea, onSelectTask, getMarcaStyle }) {
  const cMarca = getMarcaStyle ? getMarcaStyle(tarea.marca) : { accent: "#71717a" };
  const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(tarea.estado)) || { dot: "bg-zinc-400" };
  const personasCorta = tarea.personas
    ? tarea.personas.split(/[\s,]+/).filter(Boolean).slice(0, 2).join(", ")
    : "";

  return (
    <button
      type="button"
      onClick={() => onSelectTask(tarea)}
      className="urgent-task-card w-full text-left"
      style={{ borderLeftColor: cMarca.accent || "#71717a" }}
    >
      <div className="urgent-task-card-body">
        <p className="urgent-task-card-title">{tarea.info}</p>
        <div className="urgent-task-card-meta">
          <span className="urgent-task-card-marca" style={{ color: cMarca.accent || "#71717a" }}>
            {formatearMarca(tarea.marca)}
          </span>
          <span className="urgent-task-card-dot" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
            <span className="truncate">{normalizarEstado(tarea.estado) || "Sin estado"}</span>
          </span>
          <span className="urgent-task-card-dot" aria-hidden="true">·</span>
          <span className="truncate shrink-0">{tarea.deadline ? formatearFecha(tarea.deadline) : "Sin fecha"}</span>
          {personasCorta && (
            <>
              <span className="urgent-task-card-dot" aria-hidden="true">·</span>
              <span className="truncate">{personasCorta}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function HomeUrgentesCarousel({ tareas, onSelectTask, getMarcaStyle, onVerTodas }) {
  if (!tareas || tareas.length === 0) {
    return (
      <section className="home-section md:hidden" data-induccion="urgentes">
        <div className="home-section__head">
          <span className="home-section__title">Prioridad alta</span>
        </div>
        <p className="home-section__empty">Sin urgentes</p>
      </section>
    );
  }

  return (
    <section className="home-section md:hidden" data-induccion="urgentes">
      <div className="home-section__head">
        <div className="home-section__head-left">
          <span className="home-section__title">Prioridad alta</span>
          <span className="home-section__subtitle">
            {tareas.length} pendiente{tareas.length !== 1 ? "s" : ""}
          </span>
        </div>
        {onVerTodas && (
          <button type="button" onClick={onVerTodas} className="home-section__link">
            Ver todos
            <SVGIcon.ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="home-urgentes-mobile-list">
        {tareas.map((t) => (
          <HomeUrgenteMobileCard
            key={t.idTarea}
            tarea={t}
            onSelectTask={onSelectTask}
            getMarcaStyle={getMarcaStyle}
          />
        ))}
      </div>
    </section>
  );
}

function HomeUrgentesCarousel({ tareas, onSelectTask, getMarcaStyle, onVerTodas }) {
  if (!tareas || tareas.length === 0) {
    return (
      <section className="home-section md:hidden" data-induccion="urgentes">
        <div className="home-section__head">
          <span className="home-section__title">Urgentes</span>
        </div>
        <p className="home-section__empty">Sin urgentes</p>
      </section>
    );
  }

  return (
    <section className="home-section md:hidden" data-induccion="urgentes">
      <div className="home-section__head">
        <div className="home-section__head-left">
          <span className="home-section__title">Urgentes</span>
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

      <div className="home-tiles-scroll">
        {tareas.map((t) => {
          const subcliente = typeof obtenerSubclienteTarea === "function"
            ? obtenerSubclienteTarea(t)
            : String(t.subcliente || "").trim();
          const metaParts = [];
          if (subcliente) metaParts.push(subcliente);
          metaParts.push(normalizarEstado(t.estado));
          if (t.deadline) metaParts.push(formatearFecha(t.deadline));

          return (
            <HomeTaskTile
              key={t.idTarea}
              tarea={t}
              onSelect={onSelectTask}
              getMarcaStyle={getMarcaStyle}
              footMeta={metaParts.join(" · ")}
            />
          );
        })}
      </div>
    </section>
  );
}

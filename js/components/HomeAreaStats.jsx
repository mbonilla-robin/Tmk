function HomeAreaStatTile({ label, value, tone, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`home-area-stat home-area-stat--${tone}`}>
      <span className="home-area-stat__top">
        <span className="home-area-stat__dot" aria-hidden="true" />
        <span className="home-area-stat__label">{label}</span>
      </span>
      <span className="home-area-stat__value">{value}</span>
    </button>
  );
}

function HomeAreaStats({ stats, onStatTap, variant = "mobile", className = "" }) {
  const esDesktop = variant === "desktop";
  const sectionClass = [
    "home-section",
    "home-area-stats",
    esDesktop ? "home-area-stats--desktop" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <section className={sectionClass} data-induccion="resumen-area">
      <div className="home-section__head">
        <span className="home-section__title">Resumen del área</span>
      </div>
      <div className="home-area-stats__grid">
        <HomeAreaStatTile
          label="Total"
          value={stats.total}
          tone="total"
          onClick={() => onStatTap && onStatTap("total")}
        />
        <HomeAreaStatTile
          label="Activos"
          value={stats.enProgreso}
          tone="active"
          onClick={() => onStatTap && onStatTap("activos")}
        />
        <HomeAreaStatTile
          label="Listos"
          value={stats.completadas}
          tone="done"
          onClick={() => onStatTap && onStatTap("listos")}
        />
        <HomeAreaStatTile
          label="Atraso"
          value={stats.atrasadas}
          tone="late"
          onClick={() => onStatTap && onStatTap("atrasadas")}
        />
      </div>
    </section>
  );
}

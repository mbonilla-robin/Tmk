function HomeMobileCommandCenter({ fechaLabel, primerNombre }) {
  return (
    <header className="home-mobile-hero md:hidden" data-induccion="home-hero">
      <div className="home-mobile-hero__bg" aria-hidden="true">
        <div className="home-mobile-hero__orb home-mobile-hero__orb--1" />
        <div className="home-mobile-hero__orb home-mobile-hero__orb--2" />
      </div>

      <div className="home-mobile-hero__content">
        <p className="home-mobile-hero__date">{fechaLabel}</p>
        <h1 className="home-mobile-hero__title">
          Hola, <span className="home-mobile-hero__name">{primerNombre}</span>
        </h1>
        <p className="home-mobile-hero__subtitle">Resumen de tu área</p>
      </div>
    </header>
  );
}

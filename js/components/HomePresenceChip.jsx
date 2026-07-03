function HomePresenceChip({ saludo, otrosUsuariosEnLinea, presenceEstado }) {
  const [expandido, setExpandido] = useState(false);
  const hayOtros = presenceEstado === "ready" && otrosUsuariosEnLinea.length > 0;

  const textoEstado = presenceEstado === "connecting"
    ? "Conectando..."
    : presenceEstado === "error"
      ? "Sin conexión"
      : null;

  return (
    <div className="home-presence-chip md:hidden" data-induccion="presencia">
      <button
        type="button"
        className="home-presence-chip__main"
        onClick={() => hayOtros && setExpandido((v) => !v)}
        aria-expanded={expandido}
        disabled={!hayOtros}
      >
        <span className="home-presence-chip__dot" aria-hidden="true" />
        <span className="home-presence-chip__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1.75 13.25c0-2.07 1.68-3.75 3.75-3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="11" cy="4.75" r="1.85" stroke="currentColor" strokeWidth="1.2" />
            <path d="M7.5 13.25c0-1.9 1.55-3.45 3.45-3.45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="home-presence-chip__text">
          Tú ({saludo})
          {hayOtros && (
            <span className="home-presence-chip__more">
              {" "}+ {otrosUsuariosEnLinea.length} en línea
            </span>
          )}
          {textoEstado && (
            <span className="home-presence-chip__status"> · {textoEstado}</span>
          )}
        </span>
        {hayOtros && (
          <svg
            className={`home-presence-chip__chevron ${expandido ? "is-open" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {expandido && hayOtros && (
        <div className="home-presence-chip__list">
          {otrosUsuariosEnLinea.map((u, index) => (
            <span key={u.uid || `user-${index}`} className="home-presence-chip__person">
              <span className="home-presence-chip__dot home-presence-chip__dot--sm" aria-hidden="true" />
              {formatearNombrePresencia(u)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

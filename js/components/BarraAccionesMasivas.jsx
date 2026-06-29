function BarraAccionesMasivas({
  count,
  bulkDeadline,
  setBulkDeadline,
  onBulkUpdate,
  onClear
}) {
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [ancla, setAncla] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (barRef.current && !barRef.current.contains(event.target)) {
        setMenuAbierto(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!count) setMenuAbierto(null);
  }, [count]);

  useEffect(() => {
    if (!count) return undefined;

    const actualizarAncla = () => {
      const main = document.querySelector("[data-robin-content-main]");
      if (!main) return;
      const rect = main.getBoundingClientRect();
      const styles = window.getComputedStyle(main);
      const padLeft = parseFloat(styles.paddingLeft) || 0;
      const padRight = parseFloat(styles.paddingRight) || 0;
      setAncla({
        left: rect.left + padLeft,
        width: rect.width - padLeft - padRight
      });
    };

    actualizarAncla();
    window.addEventListener("resize", actualizarAncla);

    const main = document.querySelector("[data-robin-content-main]");
    const observer = main && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(actualizarAncla)
      : null;
    if (main && observer) observer.observe(main);

    return () => {
      window.removeEventListener("resize", actualizarAncla);
      if (observer) observer.disconnect();
    };
  }, [count]);

  if (!count) return null;

  const toggleMenu = (menu) => {
    setMenuAbierto((actual) => (actual === menu ? null : menu));
  };

  const aplicarEstado = (valor) => {
    if (valor) onBulkUpdate("estado", valor);
    setMenuAbierto(null);
  };

  const aplicarPrioridad = (valor) => {
    if (valor) onBulkUpdate("prioridad", valor);
    setMenuAbierto(null);
  };

  const aplicarFecha = (valor) => {
    const norm = normalizarDeadline(valor);
    if (norm) onBulkUpdate("deadline", norm);
    setMenuAbierto(null);
  };

  return (
    <ModalPortal>
      <div
        className="bulk-action-bar-anchor"
        style={ancla ? { left: `${ancla.left}px`, width: `${ancla.width}px` } : undefined}
      >
        <div className="bulk-action-bar" ref={barRef} role="toolbar" aria-label="Acciones masivas">
          <span className="bulk-action-count">
            {count} seleccionado{count !== 1 ? "s" : ""}
          </span>

          <div className="bulk-action-buttons">
            <div className="bulk-action-btn-wrap">
              <button
                type="button"
                className={`bulk-action-btn ${menuAbierto === "estado" ? "is-open" : ""}`}
                onClick={() => toggleMenu("estado")}
              >
                <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" />
                Estado
              </button>
              {menuAbierto === "estado" && (
                <div className="bulk-action-menu">
                  {LISTA_ESTADOS_VALIDOS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="bulk-action-menu-item"
                      onClick={() => aplicarEstado(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bulk-action-btn-wrap">
              <button
                type="button"
                className={`bulk-action-btn ${menuAbierto === "prioridad" ? "is-open" : ""}`}
                onClick={() => toggleMenu("prioridad")}
              >
                <i className="fa-solid fa-flag" aria-hidden="true" />
                Prioridad
              </button>
              {menuAbierto === "prioridad" && (
                <div className="bulk-action-menu">
                  {PRIORIDADES_MAPA.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="bulk-action-menu-item"
                      onClick={() => aplicarPrioridad(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bulk-action-btn-wrap">
              <button
                type="button"
                className={`bulk-action-btn ${menuAbierto === "fecha" ? "is-open" : ""}`}
                onClick={() => toggleMenu("fecha")}
              >
                <i className="fa-regular fa-calendar" aria-hidden="true" />
                Fecha
              </button>
              {menuAbierto === "fecha" && (
                <div className="bulk-action-menu bulk-action-menu--fecha">
                  <InputFechaLibre
                    value={bulkDeadline}
                    onChange={setBulkDeadline}
                    onBlurExtra={aplicarFecha}
                    className="bulk-action-date-input"
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="bulk-action-clear"
            onClick={onClear}
            aria-label="Limpiar selección"
            title="Limpiar selección"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

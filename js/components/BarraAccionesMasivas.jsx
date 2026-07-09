function BarraAccionesMasivas({
  count,
  tareasSeleccionadas = [],
  bulkDeadline,
  setBulkDeadline,
  onBulkUpdate,
  onClear
}) {
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [ancla, setAncla] = useState(null);
  const [modalEstatus, setModalEstatus] = useState(false);
  const [textoEstatus, setTextoEstatus] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [compartido, setCompartido] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest?.(".fecha-picker-popup")) return;
      if (event.target.closest?.(".bulk-action-menu")) return;
      if (barRef.current && !barRef.current.contains(event.target)) {
        setMenuAbierto(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
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

  const handleMenuToggle = (event, menu) => {
    event.stopPropagation();
    toggleMenu(menu);
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

  const abrirEstatus = () => {
    const texto = generarTextoEstatusDesdeSeleccion(tareasSeleccionadas);
    setTextoEstatus(texto || "No hay tareas seleccionadas.");
    setCopiado(false);
    setCompartido(false);
    setMenuAbierto(null);
    setModalEstatus(true);
  };

  const cerrarEstatus = () => {
    setModalEstatus(false);
    setCopiado(false);
    setCompartido(false);
  };

  const handleCopiarEstatus = async () => {
    try {
      await navigator.clipboard.writeText(textoEstatus);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = textoEstatus;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleCompartirEstatus = async () => {
    const resultado = await compartirTexto(textoEstatus, { titulo: "Estatus ROBIN" });
    if (resultado.ok) {
      setCompartido(true);
      setTimeout(() => setCompartido(false), 2000);
    }
  };

  return (
    <>
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
                onClick={(e) => handleMenuToggle(e, "estado")}
                aria-label="Cambiar estado"
              >
                <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" />
                <span className="bulk-action-btn__label">Estado</span>
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
                onClick={(e) => handleMenuToggle(e, "prioridad")}
                aria-label="Cambiar prioridad"
              >
                <i className="fa-solid fa-flag" aria-hidden="true" />
                <span className="bulk-action-btn__label">Prioridad</span>
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
                onClick={(e) => handleMenuToggle(e, "fecha")}
                aria-label="Cambiar fecha"
              >
                <i className="fa-regular fa-calendar" aria-hidden="true" />
                <span className="bulk-action-btn__label">Fecha</span>
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

            <button
              type="button"
              className="bulk-action-btn"
              onClick={abrirEstatus}
              aria-label="Generar estatus"
            >
              <i className="fa-solid fa-file-lines" aria-hidden="true" />
              <span className="bulk-action-btn__label">Estatus</span>
            </button>
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

      {modalEstatus && (
        <ModalPortal>
        <div className="bulk-estatus-overlay" role="dialog" aria-modal="true" aria-label="Estatus generado">
          <button
            type="button"
            className="bulk-estatus-backdrop"
            onClick={cerrarEstatus}
            aria-label="Cerrar"
          />
          <div className="bulk-estatus-panel animate-zoom-in">
            <div className="bulk-estatus-handle" aria-hidden="true" />
            <div className="bulk-estatus-header">
              <span className="bulk-estatus-title">
                Estatus ({tareasSeleccionadas.length} tarea{tareasSeleccionadas.length !== 1 ? "s" : ""})
              </span>
              <button
                type="button"
                onClick={cerrarEstatus}
                className="bulk-estatus-close"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>

            <div className="bulk-estatus-body">
              <pre className="bulk-estatus-text">{textoEstatus}</pre>

              <div className="bulk-estatus-actions">
                <button
                  type="button"
                  onClick={handleCompartirEstatus}
                  className="bulk-estatus-btn bulk-estatus-btn--primary"
                >
                  <i className="fa-brands fa-whatsapp" aria-hidden="true" />
                  {compartido ? "¡Listo!" : "Enviar por WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={handleCopiarEstatus}
                  className="bulk-estatus-btn bulk-estatus-btn--secondary"
                >
                  <i className="fa-regular fa-copy" aria-hidden="true" />
                  {copiado ? "¡Copiado!" : "Copiar texto"}
                </button>
                <button
                  type="button"
                  onClick={cerrarEstatus}
                  className="bulk-estatus-btn bulk-estatus-btn--ghost"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}

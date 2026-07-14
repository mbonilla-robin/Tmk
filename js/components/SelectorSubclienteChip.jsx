function SelectorSubclienteChip({
  valor,
  onChange,
  marca,
  listaGlobal,
  registrarNuevoSubcliente,
  variant = "default",
  titulo = "Subcliente"
}) {
  const [buscar, setBuscar] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [esMobile, setEsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );
  const containerRef = useRef(null);
  const panelRef = useRef(null);

  const seleccionado = useMemo(() => normalizarNombreSubcliente(valor), [valor]);

  const opciones = useMemo(() => {
    return listarSubclientesPorMarca(listaGlobal, marca).map((s) => s.nombre);
  }, [listaGlobal, marca]);

  const opcionesFiltradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return opciones;
    return opciones.filter((n) => n.toLowerCase().includes(q));
  }, [opciones, buscar]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setEsMobile(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else mq.addListener(sync);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", sync);
      else mq.removeListener(sync);
    };
  }, []);

  const handleSelect = (nombre) => {
    const norm = normalizarNombreSubcliente(nombre);
    if (!norm) return;
    if (subclientesCoinciden(seleccionado, norm)) {
      onChange("");
    } else {
      onChange(norm);
    }
    setBuscar("");
    if (!esMobile) setDropdownOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const handleAddCustom = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      e.preventDefault();
      const val = buscar.trim();
      if (!val || !esNombreSubclienteNuevoValido(val)) return;
      const canon = normalizarNombreSubcliente(val);
      if (!canon) return;
      if (typeof registrarNuevoSubcliente === "function") {
        registrarNuevoSubcliente(marca, canon);
      }
      onChange(canon);
      setBuscar("");
      setDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (!dropdownOpen) return undefined;

    const handlePointerOutside = (event) => {
      const target = event.target;
      const inTrigger = containerRef.current && containerRef.current.contains(target);
      const inPanel = panelRef.current && panelRef.current.contains(target);
      if (!inTrigger && !inPanel) setDropdownOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setDropdownOpen(false);
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  const triggerClass = variant === "minimal"
    ? "selector-chip-trigger selector-chip-trigger--minimal"
    : "selector-chip-trigger";

  const puedeCrear = esNombreSubclienteNuevoValido(buscar)
    && !opciones.some((n) => subclientesCoinciden(n, buscar));

  const renderOpciones = () => (
    <>
      <p className="selector-chip-panel__hint">
        Opcional. Busca un subcliente de esta marca o crea uno nuevo.
      </p>
      <div className="selector-chip-panel__search">
        <input
          type="text"
          placeholder="Buscar o crear..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          onKeyDown={handleAddCustom}
          className="selector-chip-panel__input"
          autoFocus={!esMobile}
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={!puedeCrear}
          className="selector-chip-panel__add"
        >
          Añadir
        </button>
      </div>
      <div className="selector-chip-panel__list">
        {opcionesFiltradas.length === 0 && !puedeCrear ? (
          <p className="selector-chip-panel__empty">
            {buscar.trim() ? "Sin coincidencias" : "Aún no hay subclientes en esta marca"}
          </p>
        ) : (
          opcionesFiltradas.map((nombre) => {
            const isSel = subclientesCoinciden(seleccionado, nombre);
            return (
              <button
                key={nombre}
                type="button"
                onClick={() => handleSelect(nombre)}
                className={`selector-chip-option ${isSel ? "is-selected" : ""}`}
              >
                <span className="selector-chip-option__label">
                  <i className="fa-solid fa-store selector-chip-option__icon" aria-hidden="true" />
                  {nombre}
                </span>
                {isSel && <i className="fa-solid fa-check" aria-hidden="true" />}
              </button>
            );
          })
        )}
      </div>
    </>
  );

  const mobileSheet = dropdownOpen && esMobile ? (
    <div className="selector-chip-sheet" role="dialog" aria-label={titulo}>
      <button
        type="button"
        className="selector-chip-sheet__backdrop"
        aria-label="Cerrar"
        onClick={() => setDropdownOpen(false)}
      />
      <div ref={panelRef} className="selector-chip-sheet__panel">
        <div className="selector-chip-sheet__handle" aria-hidden="true" />
        <div className="selector-chip-sheet__head">
          <h3 className="selector-chip-sheet__title">{titulo}</h3>
          <button
            type="button"
            className="selector-chip-sheet__done"
            onClick={() => setDropdownOpen(false)}
          >
            Listo
          </button>
        </div>
        {renderOpciones()}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full selector-chip-root">
      <button
        type="button"
        onClick={() => setDropdownOpen(true)}
        className={triggerClass}
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
      >
        {!seleccionado ? (
          <span className="selector-chip-trigger__placeholder">Tocar para elegir</span>
        ) : (
          <span className="selector-chip-pill">
            <i className="fa-solid fa-store selector-chip-pill__icon" aria-hidden="true" />
            {seleccionado}
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClear(e);
                }
              }}
              className="selector-chip-pill__remove"
              aria-label="Quitar subcliente"
            >
              &times;
            </span>
          </span>
        )}
      </button>

      {dropdownOpen && !esMobile && (
        <div ref={panelRef} className="selector-chip-dropdown">
          {renderOpciones()}
        </div>
      )}

      {mobileSheet ? ReactDOM.createPortal(mobileSheet, document.body) : null}
    </div>
  );
}

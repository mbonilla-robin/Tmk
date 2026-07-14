function SelectorCategoriasChips({
  categoriasSeleccionadas,
  onChange,
  listaGlobal,
  registrarNuevaCategoria,
  variant = "default",
  titulo = "Categoría"
}) {
  const [buscar, setBuscar] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [esMobile, setEsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );
  const containerRef = useRef(null);
  const panelRef = useRef(null);

  const seleccionadas = useMemo(() => partesCampoCategorias(categoriasSeleccionadas), [categoriasSeleccionadas]);
  const principal = seleccionadas[0] || "";
  const subcategorias = seleccionadas.slice(1);

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

  const aplicarCambio = (items) => {
    const principalNueva = items[0] || "";
    onChange(serializarCategoriasTarea(principalNueva, items.slice(1)));
  };

  const handleToggle = (nombre) => {
    const clave = claveCategoria(nombre);
    const yaEsta = seleccionadas.some((c) => claveCategoria(c) === clave);
    if (yaEsta) {
      aplicarCambio(seleccionadas.filter((c) => claveCategoria(c) !== clave));
      return;
    }
    aplicarCambio([...seleccionadas, normalizarNombreCategoria(nombre)]);
  };

  const handlePromover = (e, nombre) => {
    e.stopPropagation();
    const clave = claveCategoria(nombre);
    const resto = seleccionadas.filter((c) => claveCategoria(c) !== clave);
    aplicarCambio([nombre, ...resto]);
  };

  const handleAddCustom = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      e.preventDefault();
      const val = buscar.trim();
      if (!val || !esNombreCategoriaNuevaValido(val)) return;
      const canon = resolverCategoriaCanonica(val) || normalizarNombreCategoria(val);
      if (!canon) return;
      registrarNuevaCategoria(canon);
      if (!seleccionadas.some((c) => claveCategoria(c) === claveCategoria(val))) {
        aplicarCambio([...seleccionadas, val]);
      }
      setBuscar("");
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

  const renderChip = (nombre, esPrincipal) => {
    const estilo = obtenerEstiloCategoriaPorNombre(nombre, listaGlobal);
    return (
      <span
        key={nombre}
        className={`selector-chip-pill ${estilo.bg} ${estilo.text} ${estilo.border} ${esPrincipal ? "is-principal" : ""}`}
        title={esPrincipal ? "Categoría principal (va al título)" : "Subcategoría — toca la estrella para hacer principal"}
      >
        {esPrincipal ? (
          <i className="fa-solid fa-star selector-chip-pill__star" aria-hidden="true" />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => handlePromover(e, nombre)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePromover(e, nombre);
              }
            }}
            className="selector-chip-pill__star-btn"
            title="Hacer principal"
          >
            <i className="fa-regular fa-star" aria-hidden="true" />
          </span>
        )}
        {nombre}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); handleToggle(nombre); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              handleToggle(nombre);
            }
          }}
          className="selector-chip-pill__remove"
          aria-label={`Quitar ${nombre}`}
        >
          &times;
        </span>
      </span>
    );
  };

  const listaFiltrada = (listaGlobal || []).filter((c) =>
    c.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  const renderOpciones = () => (
    <>
      <p className="selector-chip-panel__hint">
        La primera es la principal y se agrega al título. Las demás son subcategorías.
      </p>
      <div className="selector-chip-panel__search">
        <input
          type="text"
          placeholder="Nueva categoría..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value.replace(/\s+/g, ""))}
          onKeyDown={handleAddCustom}
          className="selector-chip-panel__input"
          autoFocus={!esMobile}
        />
        <button type="button" onClick={handleAddCustom} className="selector-chip-panel__add">
          Añadir
        </button>
      </div>
      <div className="selector-chip-panel__list">
        {listaFiltrada.map((c) => {
          const isSel = seleccionadas.some((s) => claveCategoria(s) === claveCategoria(c.nombre));
          const estilo = obtenerEstiloCategoria(c.color);
          return (
            <button
              key={c.nombre}
              type="button"
              onClick={() => handleToggle(c.nombre)}
              className={`selector-chip-option ${isSel ? "is-selected" : ""}`}
            >
              <span className="selector-chip-option__label">
                <span className={`selector-chip-option__dot ${estilo.dot}`} />
                {c.nombre}
                {isSel && claveCategoria(c.nombre) === claveCategoria(principal) && (
                  <span className="selector-chip-option__badge">principal</span>
                )}
              </span>
              {isSel && <i className="fa-solid fa-check" aria-hidden="true" />}
            </button>
          );
        })}
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
        {seleccionadas.length === 0 ? (
          <span className="selector-chip-trigger__placeholder">Tocar para elegir</span>
        ) : (
          <>
            {principal && renderChip(principal, true)}
            {subcategorias.map((cat) => renderChip(cat, false))}
          </>
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

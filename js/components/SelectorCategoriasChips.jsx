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

  const parsed = useMemo(() => parseCategoriasTarea(categoriasSeleccionadas), [categoriasSeleccionadas]);
  const principal = parsed.principal || "";
  const subcategorias = parsed.subcategorias || [];
  const seleccionadas = useMemo(() => {
    const list = [];
    if (principal) list.push(principal);
    subcategorias.forEach((c) => {
      if (!list.some((x) => claveCategoria(x) === claveCategoria(c))) list.push(c);
    });
    return list;
  }, [principal, subcategorias]);

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

  const aplicar = (nuevoPrincipal, nuevasSubs) => {
    onChange(serializarCategoriasTarea(nuevoPrincipal || "", nuevasSubs || []));
  };

  const handleToggle = (nombre) => {
    const clave = claveCategoria(nombre);
    const yaEsta = seleccionadas.some((c) => claveCategoria(c) === clave);
    if (yaEsta) {
      const restantes = seleccionadas.filter((c) => claveCategoria(c) !== clave);
      if (claveCategoria(principal) === clave) {
        aplicar("", restantes);
        return;
      }
      const subs = restantes.filter((c) => claveCategoria(c) !== claveCategoria(principal));
      aplicar(principal, subs);
      return;
    }
    const canon = resolverCategoriaCanonica(nombre) || normalizarNombreCategoria(nombre);
    if (!canon) return;
    aplicar(principal, [...subcategorias, canon]);
  };

  const handleStar = (e, nombre) => {
    e.stopPropagation();
    const clave = claveCategoria(nombre);
    if (claveCategoria(principal) === clave) {
      aplicar("", seleccionadas);
      return;
    }
    const resto = seleccionadas.filter((c) => claveCategoria(c) !== clave);
    aplicar(nombre, resto);
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
        aplicar(principal, [...subcategorias, canon]);
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

  const renderChip = (nombre) => {
    const estilo = obtenerEstiloCategoriaPorNombre(nombre, listaGlobal);
    const esPrincipal = Boolean(principal) && claveCategoria(nombre) === claveCategoria(principal);
    return (
      <span
        key={nombre}
        className={`selector-chip-pill ${estilo.bg} ${estilo.text} ${estilo.border} ${esPrincipal ? "is-principal" : ""}`}
        title={esPrincipal
          ? "Va en el título — toca la estrella para quitarla"
          : "Toca la estrella para mostrar esta categoría en el título"}
      >
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => handleStar(e, nombre)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleStar(e, nombre);
            }
          }}
          className="selector-chip-pill__star-btn"
          title={esPrincipal ? "Quitar del título" : "Mostrar en el título"}
          aria-label={esPrincipal ? `Quitar ${nombre} del título` : `Mostrar ${nombre} en el título`}
          aria-pressed={esPrincipal}
        >
          <i
            className={`${esPrincipal ? "fa-solid" : "fa-regular"} fa-star${esPrincipal ? " selector-chip-pill__star" : ""}`}
            aria-hidden="true"
          />
        </span>
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
        Por defecto la categoría solo queda como etiqueta. Activa la estrella si quieres que aparezca en el título.
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
          const esPrincipal = isSel && claveCategoria(c.nombre) === claveCategoria(principal);
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
                {esPrincipal && (
                  <span className="selector-chip-option__badge">en título</span>
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
          seleccionadas.map((cat) => renderChip(cat))
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

function SelectorPersonasChips({
  personasSeleccionadas,
  onChange,
  listaGlobal,
  registrarNuevaPersona,
  variant = "default",
  expandirTradeComo = "equipo",
  titulo = "Personas",
  autoAbrir = false,
  onCerrarSinSeleccion
}) {
  const [buscar, setBuscar] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(Boolean(autoAbrir));
  const [esMobile, setEsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const onCerrarSinSeleccionRef = useRef(onCerrarSinSeleccion);

  const seleccionadasArray = useMemo(() => partesCampoPersonas(personasSeleccionadas), [personasSeleccionadas]);

  useEffect(() => {
    onCerrarSinSeleccionRef.current = onCerrarSinSeleccion;
  }, [onCerrarSinSeleccion]);

  useEffect(() => {
    if (autoAbrir) setDropdownOpen(true);
  }, [autoAbrir]);

  const cerrarDropdown = () => {
    setDropdownOpen(false);
    if (seleccionadasArray.length === 0 && typeof onCerrarSinSeleccionRef.current === "function") {
      onCerrarSinSeleccionRef.current();
    }
  };

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
    onChange(normalizarCampoPersonas(items.join(", ")));
  };

  const obtenerObjetivosTradeDisenadores = () => {
    const base = Array.isArray(listaGlobal) ? listaGlobal : [];
    const objetivos = base
      .filter((persona) => {
        const entrada = String(persona || "").trim();
        if (!entrada) return false;
        const clave = normalizarClavePersona(entrada);
        if (clave === "trade" || clave === "cliente") return false;
        return esPersonaDisenador(entrada);
      })
      .map((persona) => formatearEntradaListaPersona(persona))
      .filter(Boolean);

    return objetivos.length ? objetivos : obtenerListaDisenadoresActiva().filter(esPersonaDisenador);
  };

  const handleTogglePersona = (p) => {
    const esTrade = normalizarClavePersona(p) === "trade";
    const objetivos = esTrade && expandirTradeComo === "disenadores"
      ? obtenerObjetivosTradeDisenadores()
      : partesCampoPersonas(p);
    const todosSeleccionados = objetivos.length > 0 && objetivos.every((handle) => seleccionadasArray.includes(handle));

    let nuevas;
    if (todosSeleccionados) {
      const quitar = new Set(objetivos);
      nuevas = seleccionadasArray.filter((item) => !quitar.has(item));
    } else {
      nuevas = [...seleccionadasArray];
      objetivos.forEach((handle) => {
        if (!nuevas.includes(handle)) nuevas.push(handle);
      });
    }
    aplicarCambio(nuevas);
  };

  const handleAddCustom = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      e.preventDefault();
      let val = buscar.trim();
      if (!val) return;
      if (!val.startsWith("@")) val = "@" + val;
      const entrada = obtenerEntradaListaPermitida(val);
      if (!entrada) {
        setBuscar("");
        return;
      }
      registrarNuevaPersona(entrada);
      const esTrade = normalizarClavePersona(entrada) === "trade";
      if (esTrade && expandirTradeComo === "disenadores") {
        aplicarCambio([...seleccionadasArray, ...obtenerObjetivosTradeDisenadores()]);
      } else {
        aplicarCambio([...seleccionadasArray, entrada]);
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
      if (!inTrigger && !inPanel) cerrarDropdown();
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") cerrarDropdown();
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen, seleccionadasArray.length]);

  const listaFiltrada = useMemo(() => {
    const base = Array.isArray(listaGlobal) ? listaGlobal : [];
    const busqueda = buscar.toLowerCase();
    return base.filter((p) => {
      const etiqueta = etiquetaDisplayListaPersona(p);
      return etiqueta.toLowerCase().includes(busqueda) || String(p).toLowerCase().includes(busqueda);
    });
  }, [listaGlobal, buscar]);

  const triggerClass = variant === "minimal"
    ? "selector-chip-trigger selector-chip-trigger--minimal"
    : "selector-chip-trigger";

  const renderOpciones = () => (
    <>
      <div className="selector-chip-panel__search">
        <input
          type="text"
          placeholder="Escribir o buscar..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          onKeyDown={handleAddCustom}
          className="selector-chip-panel__input"
          autoFocus={!esMobile}
        />
        <button
          type="button"
          onClick={handleAddCustom}
          className="selector-chip-panel__add"
        >
          Añadir
        </button>
      </div>
      <div className="selector-chip-panel__list">
        {listaFiltrada.length === 0 ? (
          <p className="selector-chip-panel__empty">Sin coincidencias</p>
        ) : (
          listaFiltrada.map((p) => {
            const isSel = personaEstaSeleccionada(p, seleccionadasArray);
            const clave = claveUnicaPersonaLista(p);
            return (
              <button
                key={clave || p}
                type="button"
                onClick={() => handleTogglePersona(p)}
                className={`selector-chip-option ${isSel ? "is-selected" : ""}`}
              >
                <span>{etiquetaDisplayListaPersona(p)}</span>
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
        onClick={cerrarDropdown}
      />
      <div ref={panelRef} className="selector-chip-sheet__panel">
        <div className="selector-chip-sheet__handle" aria-hidden="true" />
        <div className="selector-chip-sheet__head">
          <h3 className="selector-chip-sheet__title">{titulo}</h3>
          <button
            type="button"
            className="selector-chip-sheet__done"
            onClick={cerrarDropdown}
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
        {seleccionadasArray.length === 0 ? (
          <span className="selector-chip-trigger__placeholder">Tocar para elegir</span>
        ) : (
          seleccionadasArray.map((p) => (
            <span key={claveUnicaPersonaLista(p) || p} className="selector-chip-pill">
              {etiquetaDisplayListaPersona(p)}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); handleTogglePersona(p); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTogglePersona(p);
                  }
                }}
                className="selector-chip-pill__remove"
                aria-label={`Quitar ${etiquetaDisplayListaPersona(p)}`}
              >
                &times;
              </span>
            </span>
          ))
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

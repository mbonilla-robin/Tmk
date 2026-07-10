function tituloCortoRelacion(tarea, max = 42) {
  const titulo = tituloDisplayTarea(tarea);
  if (titulo.length <= max) return titulo;
  return `${titulo.slice(0, max - 1).trim()}…`;
}

function ChipTareaRelacionada({ tarea, sugerida, onAbrir, onAceptar, onDescartar, getMarcaStyle }) {
  const titulo = tituloDisplayTarea(tarea);
  const tituloCorto = tituloCortoRelacion(tarea);
  const marcaEstilo = getMarcaStyle ? getMarcaStyle(tarea.marca) : { accent: "#71717A" };

  if (sugerida) {
    return (
      <div className="task-related-pill task-related-pill--suggested">
        <button
          type="button"
          className="task-related-pill__open"
          onClick={() => onAbrir(tarea)}
          title={titulo}
        >
          <span
            className="task-related-pill__dot"
            style={{ backgroundColor: marcaEstilo.accent }}
            aria-hidden="true"
          />
          <span className="task-related-pill__name">{tituloCorto}</span>
        </button>
        <button
          type="button"
          className="task-related-pill__add"
          onClick={(e) => { e.stopPropagation(); onAceptar(tarea); }}
          title="Relacionar"
          aria-label={`Relacionar con ${titulo}`}
        >
          <i className="fa-solid fa-plus" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="task-related-pill__dismiss"
          onClick={(e) => { e.stopPropagation(); onDescartar(tarea); }}
          aria-label="Descartar sugerencia"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="task-related-pill task-related-pill--linked"
      onClick={() => onAbrir(tarea)}
      title={titulo}
    >
      <span
        className="task-related-pill__dot"
        style={{ backgroundColor: marcaEstilo.accent }}
        aria-hidden="true"
      />
      <span className="task-related-pill__name">{tituloCorto}</span>
    </button>
  );
}

function BuscadorRelacionarTareas({ tareas, query, onQueryChange, onSeleccionar, onCerrar }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCerrar();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onCerrar]);

  return (
    <div className="task-related-search" ref={ref}>
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Buscar entregable…"
        className="task-related-search__input"
        autoFocus
      />
      <ul className="task-related-search__list" role="listbox">
        {tareas.length === 0 ? (
          <li className="task-related-search__empty">Sin resultados</li>
        ) : (
          tareas.map((t) => (
            <li key={getTaskSelectionKey(t)}>
              <button
                type="button"
                className="task-related-search__item"
                onClick={() => onSeleccionar(t)}
              >
                {tituloDisplayTarea(t)}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function TareasRelacionadas({
  tarea,
  tareas,
  relaciones,
  usuario,
  onRelacionCreada,
  onAbrirTarea,
  onToast,
  getMarcaStyle,
  zona = "controls"
}) {
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [sugerenciasOcultas, setSugerenciasOcultas] = useState(0);

  const relacionadas = useMemo(
    () => resolverTareasRelacionadas(tarea, tareas, relaciones),
    [tarea, tareas, relaciones]
  );

  const sugerencias = useMemo(
    () => sugerirTareasRelacionadas(tarea, tareas, relaciones),
    [tarea, tareas, relaciones, sugerenciasOcultas]
  );

  const resultadosBusqueda = useMemo(
    () => filtrarTareasParaRelacionar(tareas, tarea, query, relaciones),
    [tareas, tarea, query, relaciones]
  );

  const crearRelacion = async (otra) => {
    if (!otra || guardando) return;
    const keyA = resolverTaskKeyRelacion(tarea);
    const keyB = resolverTaskKeyRelacion(otra);
    if (!keyA || !keyB || keyA === keyB) return;

    setGuardando(true);
    try {
      const res = await insertarRelacionRemota(keyA, keyB, usuario);
      if (res.ok && res.local) {
        onRelacionCreada(res.local);
        setBuscadorAbierto(false);
        setQuery("");
        if (onToast) onToast("Relación guardada", "success");
      } else if (onToast) {
        onToast("No se pudo guardar la relación", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleDescartar = (otra) => {
    const keyA = resolverTaskKeyRelacion(tarea);
    const keyB = resolverTaskKeyRelacion(otra);
    guardarSugerenciaDescartada(keyA, keyB);
    setSugerenciasOcultas((n) => n + 1);
  };

  const chipsVinculadas = relacionadas.map((t) => (
    <ChipTareaRelacionada
      key={getTaskSelectionKey(t)}
      tarea={t}
      onAbrir={onAbrirTarea}
      getMarcaStyle={getMarcaStyle}
    />
  ));

  const chipsSugeridas = sugerencias.map((t) => (
    <ChipTareaRelacionada
      key={`sug-${getTaskSelectionKey(t)}`}
      tarea={t}
      sugerida
      onAbrir={onAbrirTarea}
      onAceptar={crearRelacion}
      onDescartar={handleDescartar}
      getMarcaStyle={getMarcaStyle}
    />
  ));

  if (zona === "controls") {
    return (
      <div className="task-related-controls">
        <button
          type="button"
          className="task-related-link-btn"
          onClick={() => setBuscadorAbierto((v) => !v)}
          disabled={guardando}
        >
          <i className="fa-solid fa-link" aria-hidden="true" />
          Relacionar
        </button>
        {buscadorAbierto && (
          <BuscadorRelacionarTareas
            tareas={resultadosBusqueda}
            query={query}
            onQueryChange={setQuery}
            onSeleccionar={crearRelacion}
            onCerrar={() => { setBuscadorAbierto(false); setQuery(""); }}
          />
        )}
      </div>
    );
  }

  if (zona === "internal") {
    if (!relacionadas.length && !sugerencias.length) return null;
    return (
      <div className="task-related-internal lg:hidden">
        {relacionadas.length > 0 && (
          <div className="task-related-group">
            <div className="task-related-group__label">Relacionadas</div>
            <div className="task-related-pills">{chipsVinculadas}</div>
          </div>
        )}
        {sugerencias.length > 0 && (
          <div className="task-related-group task-related-group--suggested">
            <div className="task-related-group__label">Sugeridas</div>
            <div className="task-related-pills">{chipsSugeridas}</div>
          </div>
        )}
      </div>
    );
  }

  if (zona === "external") {
    if (!relacionadas.length && !sugerencias.length) return null;
    return (
      <div className="task-related-external hidden lg:block">
        {relacionadas.length > 0 && (
          <div className="task-related-dock">
            <div className="task-related-pills">{chipsVinculadas}</div>
          </div>
        )}
        {sugerencias.length > 0 && (
          <div className="task-related-dock task-related-dock--suggested">
            <span className="task-related-dock__hint">Sugeridas</span>
            <div className="task-related-pills">{chipsSugeridas}</div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

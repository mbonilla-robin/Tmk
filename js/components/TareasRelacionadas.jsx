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
          <span className="task-related-pill__name">{titulo}</span>
        </button>
        <div className="task-related-pill__actions">
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

function FilaHermanaSubcliente({ tarea, onAbrir }) {
  const titulo = tituloDisplayTarea(tarea);
  const estado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(tarea.estado)) || ESTADOS_MAPA[0];
  const hecha = typeof esTareaCompletada === "function" && esTareaCompletada(tarea);
  const suspendida = typeof esTareaSuspendida === "function" && esTareaSuspendida(tarea);

  return (
    <button
      type="button"
      className={`task-siblings-row${hecha || suspendida ? " is-done" : ""}`}
      onClick={() => onAbrir(tarea)}
      title={titulo}
    >
      <span className={`task-siblings-row__dot ${estado.dot}`} aria-hidden="true" />
      <span className="task-siblings-row__body">
        <span className="task-siblings-row__title">{titulo}</span>
        <span className="task-siblings-row__meta">
          {normalizarEstado(tarea.estado) || "Sin estado"}
          {tarea.deadline ? ` · ${formatearFecha(tarea.deadline)}` : ""}
        </span>
      </span>
    </button>
  );
}

function ListaHermanasSubcliente({
  subcliente,
  hermanas,
  relacionadas,
  onAbrir,
  onDuplicar,
  getMarcaStyle,
  variant = "card"
}) {
  const keysHermanas = new Set(hermanas.map((t) => getTaskSelectionKey(t)));
  const vinculadasOtras = relacionadas.filter((t) => !keysHermanas.has(getTaskSelectionKey(t)));
  const esCard = variant === "card";

  return (
    <div className={esCard ? "task-siblings-card" : "task-siblings-inline"}>
      <div className="task-siblings-card__header">
        <div className="task-siblings-card__heading">
          <span className="task-siblings-card__kicker">Mismo subcliente</span>
          <span className="task-siblings-card__title">{subcliente}</span>
        </div>
        <div className="task-siblings-card__actions">
          {typeof onDuplicar === "function" && (
            <button
              type="button"
              className="subcliente-add-btn"
              title="Nuevo entregable con la misma base"
              aria-label={`Crear entregable en ${subcliente}`}
              onClick={(e) => {
                e.stopPropagation();
                onDuplicar();
              }}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
            </button>
          )}
          <span className="task-siblings-card__count">{hermanas.length}</span>
        </div>
      </div>
      <div className="task-siblings-card__list">
        {hermanas.map((t) => (
          <FilaHermanaSubcliente
            key={getTaskSelectionKey(t)}
            tarea={t}
            onAbrir={onAbrir}
          />
        ))}
      </div>
      {vinculadasOtras.length > 0 && (
        <div className="task-siblings-card__linked">
          <div className="task-related-group__label">Vinculadas</div>
          <div className="task-related-pills">
            {vinculadasOtras.map((t) => (
              <ChipTareaRelacionada
                key={getTaskSelectionKey(t)}
                tarea={t}
                onAbrir={onAbrir}
                getMarcaStyle={getMarcaStyle}
              />
            ))}
          </div>
        </div>
      )}
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
  zona = "controls",
  subcliente = "",
  marca = "",
  onDuplicarSubcliente
}) {
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const [guardando, setGuardando] = useState(false);

  const relacionadas = useMemo(() => {
    try {
      const lista = resolverTareasRelacionadas(tarea, tareas, relaciones);
      return Array.isArray(lista) ? lista : [];
    } catch (_) {
      return [];
    }
  }, [tarea, tareas, relaciones]);

  const hermanas = useMemo(() => {
    try {
      if (typeof listarTareasMismoSubcliente === "function") {
        const lista = listarTareasMismoSubcliente(tarea, tareas, { subcliente, marca });
        return Array.isArray(lista) ? lista : [];
      }
    } catch (err) {
      console.warn("ROBIN: no se pudieron listar entregables del mismo subcliente", err);
    }
    return [];
  }, [tarea, tareas, subcliente, marca]);

  const resultadosBusqueda = useMemo(() => {
    try {
      const lista = filtrarTareasParaRelacionar(tareas, tarea, query, relaciones);
      return Array.isArray(lista) ? lista : [];
    } catch (_) {
      return [];
    }
  }, [tareas, tarea, query, relaciones]);

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
    if (!hermanas.length && !relacionadas.length) return null;
    return (
      <div className="task-related-internal">
        {hermanas.length > 0 ? (
          <ListaHermanasSubcliente
            subcliente={subcliente || obtenerSubclienteTarea(tarea)}
            hermanas={hermanas}
            relacionadas={relacionadas}
            onAbrir={onAbrirTarea}
            onDuplicar={typeof onDuplicarSubcliente === "function" ? () => onDuplicarSubcliente(tarea) : undefined}
            getMarcaStyle={getMarcaStyle}
            variant="inline"
          />
        ) : (
          <div className="task-related-group">
            <div className="task-related-group__label">Vinculadas</div>
            <div className="task-related-pills">
              {relacionadas.map((t) => (
                <ChipTareaRelacionada
                  key={getTaskSelectionKey(t)}
                  tarea={t}
                  onAbrir={onAbrirTarea}
                  getMarcaStyle={getMarcaStyle}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (zona === "external") {
    if (!hermanas.length && !relacionadas.length) return null;
    return (
      <aside className="task-related-external" aria-label="Otros entregables del mismo subcliente">
        {hermanas.length > 0 ? (
          <ListaHermanasSubcliente
            subcliente={subcliente || obtenerSubclienteTarea(tarea)}
            hermanas={hermanas}
            relacionadas={relacionadas}
            onAbrir={onAbrirTarea}
            onDuplicar={typeof onDuplicarSubcliente === "function" ? () => onDuplicarSubcliente(tarea) : undefined}
            getMarcaStyle={getMarcaStyle}
            variant="card"
          />
        ) : (
          <div className="task-siblings-card">
            <div className="task-siblings-card__header">
              <div className="task-siblings-card__heading">
                <span className="task-siblings-card__kicker">Vinculadas</span>
                <span className="task-siblings-card__title">Otras tareas</span>
              </div>
              <span className="task-siblings-card__count">{relacionadas.length}</span>
            </div>
            <div className="task-related-pills task-siblings-card__linked-only">
              {relacionadas.map((t) => (
                <ChipTareaRelacionada
                  key={getTaskSelectionKey(t)}
                  tarea={t}
                  onAbrir={onAbrirTarea}
                  getMarcaStyle={getMarcaStyle}
                />
              ))}
            </div>
          </div>
        )}
      </aside>
    );
  }

  return null;
}

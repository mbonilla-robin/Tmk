function normalizarBusquedaSpotlight(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function atajoSpotlightLabel() {
  if (typeof navigator === "undefined") return "Ctrl K";
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  if (/Mac|iPhone|iPad|iPod/.test(platform) || /Mac OS X/.test(ua)) return "⌘K";
  return "Ctrl K";
}

function BuscadorSpotlight({
  abierto,
  onAbrir,
  onCerrar,
  tareas = [],
  marcas = [],
  subclientes = [],
  onAbrirTarea,
  onAbrirMarca,
  onAbrirSubcliente,
  onNavegar,
  esDisenador = false,
  getMarcaStyle
}) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [indice, setIndice] = useState(0);
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const atajo = atajoSpotlightLabel();

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || String(e.key).toLowerCase() !== "k") return;
      if (e.repeat) return;
      if (document.body.classList.contains("induccion-bloqueada")) return;
      e.preventDefault();
      if (abierto) onCerrar && onCerrar();
      else onAbrir && onAbrir();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, onAbrir, onCerrar]);

  useEffect(() => {
    if (abierto) {
      setVisible(true);
      setSaliendo(false);
      setQuery("");
      setIndice(0);
      return undefined;
    }
    if (!visible) return undefined;
    setSaliendo(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      setSaliendo(false);
      setQuery("");
    }, 180);
    return () => window.clearTimeout(t);
  }, [abierto, visible]);

  useEffect(() => {
    if (!abierto) return undefined;
    const t = window.setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 40);
    return () => window.clearTimeout(t);
  }, [abierto]);

  const resultados = useMemo(() => {
    const q = normalizarBusquedaSpotlight(query);
    const items = [];

    const paginas = [
      { id: "pag-home", tipo: "pagina", titulo: "Home", meta: "Ir al inicio", icon: "fa-house", pagina: "home" },
      { id: "pag-lista", tipo: "pagina", titulo: "Lista", meta: "Todos los entregables", icon: "fa-list", pagina: "dashboard" }
    ];
    if (!esDisenador) {
      paginas.push({ id: "pag-clientes", tipo: "pagina", titulo: "Clientes", meta: "Marcas y fichas", icon: "fa-layer-group", pagina: "clientes" });
      paginas.push({ id: "pag-equipos", tipo: "pagina", titulo: "Equipos", meta: "Personas y carga", icon: "fa-users", pagina: "equipos" });
      paginas.push({ id: "pag-informes", tipo: "pagina", titulo: "Informes", meta: "Generar informe", icon: "fa-chart-pie", pagina: "informes" });
    }

    paginas.forEach((p) => {
      if (!q || normalizarBusquedaSpotlight(`${p.titulo} ${p.meta}`).includes(q)) {
        items.push({ ...p, grupo: "Ir a" });
      }
    });

    (marcas || []).forEach((marca) => {
      const nombre = typeof formatearMarca === "function" ? formatearMarca(marca) : String(marca || "");
      if (!nombre) return;
      if (q && !normalizarBusquedaSpotlight(nombre).includes(q)) return;
      items.push({
        id: `marca-${nombre}`,
        tipo: "marca",
        titulo: nombre,
        meta: "Abrir marca",
        icon: "fa-bookmark",
        marca,
        grupo: "Marcas"
      });
    });

    if (q) {
      const vistosSub = new Set();
      const candidatos = (subclientes || []).slice();
      (tareas || []).forEach((t) => {
        const nombre = typeof obtenerSubclienteTarea === "function"
          ? obtenerSubclienteTarea(t)
          : String(t?.subcliente || "").trim();
        if (nombre && t?.marca) candidatos.push({ marca: t.marca, nombre });
      });
      candidatos.forEach((s) => {
        const nombre = String(s?.nombre || "").trim();
        const marcaRaw = s?.marca || "";
        if (!nombre || !marcaRaw) return;
        const marcaNombre = typeof formatearMarca === "function" ? formatearMarca(marcaRaw) : String(marcaRaw);
        const blob = normalizarBusquedaSpotlight(`${nombre} ${marcaNombre}`);
        if (!blob.includes(q)) return;
        const claveMarca = typeof claveMarcaSubcliente === "function"
          ? claveMarcaSubcliente(marcaRaw)
          : normalizarBusquedaSpotlight(marcaNombre);
        const claveSub = typeof claveSubcliente === "function"
          ? claveSubcliente(nombre)
          : normalizarBusquedaSpotlight(nombre);
        const id = `sub-${claveMarca}-${claveSub}`;
        if (vistosSub.has(id)) return;
        vistosSub.add(id);
        items.push({
          id,
          tipo: "subcliente",
          titulo: nombre,
          meta: `${marcaNombre} · Subcliente`,
          icon: "fa-shop",
          marca: marcaRaw,
          subcliente: nombre,
          grupo: "Subclientes"
        });
      });
    }

    const listaTareas = (tareas || []).filter((t) => t && !(typeof esTareaSuspendida === "function" && esTareaSuspendida(t)));
    listaTareas.forEach((t) => {
      const titulo = String(t.info || "Sin título");
      const marca = typeof formatearMarca === "function" ? formatearMarca(t.marca) : String(t.marca || "");
      const estado = String(t.estado || "");
      const personas = String(t.personas || "");
      const sub = typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(t) : String(t.subcliente || "");
      const blob = normalizarBusquedaSpotlight([titulo, marca, estado, personas, sub].filter(Boolean).join(" "));
      if (q && !blob.includes(q)) return;
      items.push({
        id: typeof getTaskSelectionKey === "function" ? `tarea-${getTaskSelectionKey(t)}` : `tarea-${titulo}`,
        tipo: "tarea",
        titulo,
        meta: [marca, estado].filter(Boolean).join(" · "),
        icon: "fa-file-lines",
        tarea: t,
        marca: t.marca,
        grupo: "Entregables"
      });
    });

    if (!q) {
      const atajos = items.filter((i) => i.tipo === "pagina");
      const marcasTop = items.filter((i) => i.tipo === "marca").slice(0, 6);
      const tareasTop = items.filter((i) => i.tipo === "tarea").slice(0, 5);
      return [...atajos, ...marcasTop, ...tareasTop];
    }

    return items.slice(0, 18);
  }, [query, tareas, marcas, subclientes, esDisenador]);

  useEffect(() => {
    setIndice(0);
  }, [query]);

  useEffect(() => {
    if (indice >= resultados.length) setIndice(0);
  }, [indice, resultados.length]);

  const ejecutar = (item) => {
    if (!item) return;
    if (item.tipo === "tarea" && onAbrirTarea) onAbrirTarea(item.tarea);
    else if (item.tipo === "marca" && onAbrirMarca) onAbrirMarca(item.marca);
    else if (item.tipo === "subcliente" && onAbrirSubcliente) onAbrirSubcliente(item.marca, item.subcliente);
    else if (item.tipo === "pagina" && onNavegar) onNavegar(item.pagina);
    if (onCerrar) onCerrar();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCerrar && onCerrar();
      return;
    }
    if (!resultados.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => (i + 1) % resultados.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      ejecutar(resultados[indice]);
    }
  };

  if (!visible) return null;

  const overlay = (
    <div
      className={`robin-spotlight ${saliendo ? "is-leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Buscar en Robin"
    >
      <button
        type="button"
        className="robin-spotlight__backdrop"
        aria-label="Cerrar búsqueda"
        onClick={() => onCerrar && onCerrar()}
      />
      <div className="robin-spotlight__panel">
        <div className="robin-spotlight__bar">
          <i className="fa-solid fa-magnifying-glass robin-spotlight__icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="robin-spotlight__input"
            type="text"
            value={query}
            placeholder="Buscar en Robin"
            aria-label="Buscar en Robin"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="robin-spotlight__esc">esc</kbd>
        </div>
        <div className="robin-spotlight__results" role="listbox">
          {resultados.length === 0 ? (
            <p className="robin-spotlight__empty">Sin resultados</p>
          ) : resultados.map((item, i) => {
            const mostrarGrupo = item.grupo && (i === 0 || resultados[i - 1].grupo !== item.grupo);
            const estilo = item.marca && typeof getMarcaStyle === "function" ? getMarcaStyle(item.marca) : null;
            return (
              <div key={item.id}>
                {mostrarGrupo ? <div className="robin-spotlight__group">{item.grupo}</div> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === indice}
                  className={`robin-spotlight__item ${i === indice ? "is-active" : ""}`}
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => ejecutar(item)}
                >
                  <span
                    className="robin-spotlight__item-icon"
                    style={estilo && item.tipo === "marca" ? { color: estilo.accent } : undefined}
                  >
                    <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                  </span>
                  <span className="robin-spotlight__item-copy">
                    <span className="robin-spotlight__item-title">{item.titulo}</span>
                    {item.meta ? <span className="robin-spotlight__item-meta">{item.meta}</span> : null}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="robin-spotlight__hint">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>{atajo} cerrar</span>
        </div>
      </div>
    </div>
  );

  let overlayNodo = null;
  if (visible) {
    if (typeof ModalPortal === "function") {
      overlayNodo = <ModalPortal>{overlay}</ModalPortal>;
    } else if (typeof ReactDOM !== "undefined" && ReactDOM.createPortal) {
      overlayNodo = ReactDOM.createPortal(overlay, document.body);
    } else {
      overlayNodo = overlay;
    }
  }

  return (
    <>
      {!abierto && !visible ? <BuscadorSpotlightEdge onClick={onAbrir} /> : null}
      {overlayNodo}
    </>
  );
}

function BuscadorSpotlightEdge({ onClick }) {
  const [caliente, setCaliente] = useState(false);
  const hideTimer = useRef(null);
  const atajo = atajoSpotlightLabel();

  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  const mostrar = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setCaliente(true);
  };

  const ocultar = () => {
    hideTimer.current = window.setTimeout(() => setCaliente(false), 220);
  };

  const edge = (
    <div
      className={`robin-spotlight-edge ${caliente ? "is-hot" : ""}`}
      onMouseEnter={mostrar}
      onMouseLeave={ocultar}
      onPointerEnter={mostrar}
      onClick={() => onClick && onClick()}
    >
      <button
        type="button"
        className="robin-spotlight-edge__btn"
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        aria-label="Buscar en Robin"
        title={`Buscar (${atajo})`}
      >
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
      </button>
    </div>
  );

  if (typeof ModalPortal === "function") return <ModalPortal>{edge}</ModalPortal>;
  if (typeof ReactDOM !== "undefined" && ReactDOM.createPortal) {
    return ReactDOM.createPortal(edge, document.body);
  }
  return edge;
}

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

/** Orden fijo: marca → subclientes con ese nombre → entregables. */
function mezclarResultadosSpotlight(items, limite = 22) {
  const paginas = items.filter((i) => i.tipo === "pagina");
  const marcas = items.filter((i) => i.tipo === "marca");
  const subsDirectos = items.filter((i) => i.tipo === "subcliente" && i.matchNombre);
  const tareas = items
    .filter((i) => i.tipo === "tarea")
    .sort((a, b) => Number(!!b.matchTitulo) - Number(!!a.matchTitulo));
  const subsDeMarca = items.filter((i) => i.tipo === "subcliente" && !i.matchNombre);

  const out = [];
  const tomar = (lista, n) => {
    if (n <= 0 || !lista.length) return 0;
    const slice = lista.slice(0, n);
    out.push(...slice);
    return slice.length;
  };

  tomar(paginas, paginas.length);
  tomar(marcas, marcas.length);
  tomar(subsDirectos, Math.max(0, limite - out.length));
  tomar(tareas, Math.max(0, limite - out.length));
  tomar(subsDeMarca, Math.max(0, limite - out.length));

  return out;
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
        const nombreNorm = normalizarBusquedaSpotlight(nombre);
        const marcaNorm = normalizarBusquedaSpotlight(marcaNombre);
        const coincideNombre = nombreNorm.includes(q);
        const coincideMarca = marcaNorm.includes(q);
        if (!coincideNombre && !coincideMarca) return;
        const claveMarca = typeof claveMarcaSubcliente === "function"
          ? claveMarcaSubcliente(marcaRaw)
          : marcaNorm;
        const claveSub = typeof claveSubcliente === "function"
          ? claveSubcliente(nombre)
          : nombreNorm;
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
          grupo: "Subclientes",
          matchNombre: coincideNombre
        });
      });
    }

    // Entregables activos que coinciden con la query
    const todasTareas = (tareas || []).filter(Boolean);
    const esInactivaSpotlight = (t) => {
      if (typeof esTareaCompletada === "function" && esTareaCompletada(t)) return true;
      if (typeof esTareaSuspendida === "function" && esTareaSuspendida(t)) return true;
      return typeof cleanEstado === "function" && cleanEstado(t.estado) === "completada";
    };
    const etiquetaEstadoSpotlight = (t) => {
      if (typeof esTareaSuspendida === "function" && esTareaSuspendida(t)) return "En pausa";
      if (typeof normalizarEstado === "function") return normalizarEstado(t.estado) || String(t.estado || "");
      return String(t.estado || "");
    };
    const pushTareaSpotlight = (t, { forzar = false } = {}) => {
      const titulo = String(t.info || "Sin título");
      const marca = typeof formatearMarca === "function" ? formatearMarca(t.marca) : String(t.marca || "");
      const estadoLabel = etiquetaEstadoSpotlight(t);
      const personas = String(t.personas || "");
      const sub = typeof obtenerSubclienteTarea === "function" ? obtenerSubclienteTarea(t) : String(t.subcliente || "");
      if (!forzar) {
        const blob = normalizarBusquedaSpotlight([titulo, marca, estadoLabel, personas, sub].filter(Boolean).join(" "));
        if (q && !blob.includes(q)) return;
      }
      const id = typeof getTaskSelectionKey === "function" ? `tarea-${getTaskSelectionKey(t)}` : `tarea-${titulo}`;
      if (items.some((i) => i.id === id)) return;
      const tituloNorm = normalizarBusquedaSpotlight(titulo);
      items.push({
        id,
        tipo: "tarea",
        titulo,
        meta: [marca, estadoLabel].filter(Boolean).join(" · "),
        icon: "fa-file-lines",
        tarea: t,
        marca: t.marca,
        grupo: "Entregables",
        matchTitulo: !!(q && tituloNorm.includes(q)),
        inactiva: esInactivaSpotlight(t)
      });
    };

    todasTareas.forEach((t) => {
      if (esInactivaSpotlight(t)) return;
      pushTareaSpotlight(t);
    });

    // Solo si buscas un subcliente por nombre y no tiene activos: mostrar pausa/completadas
    if (q) {
      items
        .filter((i) => i.tipo === "subcliente" && i.matchNombre)
        .forEach((subItem) => {
          const delSub = todasTareas.filter((t) => {
            const mismaMarca = typeof marcasCoinciden === "function"
              ? marcasCoinciden(t.marca, subItem.marca)
              : t.marca === subItem.marca;
            if (!mismaMarca) return false;
            const sub = typeof obtenerSubclienteTarea === "function"
              ? obtenerSubclienteTarea(t)
              : String(t.subcliente || "").trim();
            return typeof subclientesCoinciden === "function"
              ? subclientesCoinciden(sub, subItem.subcliente)
              : sub === subItem.subcliente;
          });
          const activas = delSub.filter((t) => !esInactivaSpotlight(t));
          const inactivas = delSub.filter((t) => esInactivaSpotlight(t));
          if (activas.length > 0 || inactivas.length === 0) return;
          inactivas.forEach((t) => pushTareaSpotlight(t, { forzar: true }));
        });
    }

    if (!q) {
      const atajos = items.filter((i) => i.tipo === "pagina");
      const marcasTop = items.filter((i) => i.tipo === "marca").slice(0, 6);
      const tareasTop = items.filter((i) => i.tipo === "tarea").slice(0, 5);
      return [...atajos, ...marcasTop, ...tareasTop];
    }

    return mezclarResultadosSpotlight(items, 22);
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

  return overlayNodo;
}

function BuscadorSpotlightTrigger({ onClick }) {
  const atajo = atajoSpotlightLabel();
  return (
    <div className="robin-spotlight-header-trigger">
      <button
        type="button"
        className="robin-spotlight-header-btn"
        onClick={() => onClick && onClick()}
        aria-label="¿Qué quieres buscar?"
        title={`Buscar (${atajo})`}
      >
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <span className="robin-spotlight-header-placeholder">¿Qué quieres buscar?</span>
        <kbd className="robin-spotlight-header-kbd">{atajo}</kbd>
      </button>
    </div>
  );
}

function PropertyRowMacro({ icon, label, children }) {
  return (
    <div className="task-prop-row group flex items-center min-h-[34px] py-0.5 px-1 -mx-1 rounded hover:bg-zinc-50/80 transition-colors">
      <div className="task-prop-label flex items-center gap-2 w-[128px] shrink-0 text-ui-sm text-zinc-500">
        <i className={`${icon} w-3.5 text-center text-zinc-400 text-[11px]`} />
        <span>{label}</span>
      </div>
      <div className="task-prop-value flex-1 min-w-0 flex items-center">{children}</div>
    </div>
  );
}

function ModalMacroSubcliente({
  marca,
  nombre,
  prioridad: prioridadInicial = "Media",
  link: linkInicial = "",
  tareas = [],
  onClose,
  onSave,
  onAbrirTarea,
  onCrearEntregable,
  onAbrirMarca,
  soloLectura = false
}) {
  const inputPropClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none cursor-pointer font-medium";
  const inputPropTextClass = "w-full bg-transparent border-0 text-ui-sm text-[#37352F] focus:outline-none placeholder-zinc-300 font-medium";
  const readOnlyClass = "w-full text-ui-sm text-[#37352F] font-medium leading-none";

  const [prioridad, setPrioridad] = useState(() => {
    try {
      return typeof normalizarPrioridadSubcliente === "function"
        ? normalizarPrioridadSubcliente(prioridadInicial)
        : (normalizarPrioridad(prioridadInicial) || "Media");
    } catch (_) {
      return prioridadInicial || "Media";
    }
  });
  const [link, setLink] = useState(() => String(linkInicial || "").trim());
  const [guardando, setGuardando] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState("");
  const prioridadRef = useRef(prioridad);
  const linkRef = useRef(link);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    const nextP = typeof normalizarPrioridadSubcliente === "function"
      ? normalizarPrioridadSubcliente(prioridadInicial)
      : (normalizarPrioridad(prioridadInicial) || "Media");
    setPrioridad(nextP);
    prioridadRef.current = nextP;
  }, [marca, nombre, prioridadInicial]);

  useEffect(() => {
    const nextL = String(linkInicial || "").trim();
    setLink(nextL);
    linkRef.current = nextL;
  }, [marca, nombre, linkInicial]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const subtareas = useMemo(() => {
    if (typeof listarTareasDeSubcliente === "function") {
      return listarTareasDeSubcliente(tareas, marca, nombre);
    }
    return (tareas || []).filter((t) => {
      if (!t) return false;
      if (typeof marcasCoinciden === "function" && !marcasCoinciden(t.marca, marca)) return false;
      const sub = typeof obtenerSubclienteTarea === "function"
        ? obtenerSubclienteTarea(t)
        : t.subcliente;
      return typeof subclientesCoinciden === "function"
        ? subclientesCoinciden(sub, nombre)
        : String(sub || "") === String(nombre || "");
    });
  }, [tareas, marca, nombre]);

  const completadas = useMemo(() => {
    return subtareas.filter((t) => {
      const e = typeof cleanEstado === "function" ? cleanEstado(t.estado) : String(t.estado || "").toLowerCase();
      return e === "completada";
    }).length;
  }, [subtareas]);

  const progreso = subtareas.length > 0 ? (completadas / subtareas.length) * 100 : 0;

  const persistir = async (nextPrioridad, nextLink, { propagarPrioridad = false } = {}) => {
    if (typeof onSave !== "function" || soloLectura) return;
    setGuardando(true);
    setEstadoGuardado("saving");
    try {
      await onSave({
        marca,
        nombre,
        prioridad: nextPrioridad,
        link: nextLink,
        propagarPrioridad: Boolean(propagarPrioridad)
      });
      setEstadoGuardado("saved");
    } catch (err) {
      console.warn("ROBIN: error guardando macro subcliente", err);
      setEstadoGuardado("error");
    } finally {
      setGuardando(false);
    }
  };

  const programarGuardadoLink = (nextLink) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistir(prioridadRef.current, nextLink, { propagarPrioridad: false });
    }, 450);
  };

  const handlePrioridadChange = (val) => {
    const next = typeof normalizarPrioridadSubcliente === "function"
      ? normalizarPrioridadSubcliente(val)
      : val;
    const prev = prioridadRef.current;
    setPrioridad(next);
    prioridadRef.current = next;
    const cambio = prev !== next;
    persistir(next, linkRef.current, { propagarPrioridad: cambio });
  };

  const handleLinkChange = (val) => {
    setLink(val);
    linkRef.current = val;
    programarGuardadoLink(val);
  };

  const tituloMarca = typeof formatearMarca === "function" ? formatearMarca(marca) : marca;

  return (
    <div className="task-sheet-overlay">
      <button
        type="button"
        onClick={onClose}
        className="task-sheet-backdrop"
        aria-label="Cerrar subcliente"
      />

      <div className="task-sheet-stack">
        <div className="task-sheet-panel">
          <div className="task-form-layout task-form-page min-h-0 flex-1">
            <div className="task-form-scroll">
              <div className="sticky top-0 z-10 relative bg-white/95 backdrop-blur-sm pt-3 pb-1 px-6 md:px-10 lg:pt-4">
                <div className="task-sheet-handle" aria-hidden="true" />
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 right-4 md:right-8 w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  aria-label="Cerrar"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
                <nav className="task-sheet-breadcrumb max-w-3xl mx-auto w-full pr-8" aria-label="Ruta del subcliente">
                  {typeof onAbrirMarca === "function" ? (
                    <button
                      type="button"
                      className="task-sheet-breadcrumb__link"
                      onClick={() => {
                        if (typeof onClose === "function") onClose();
                        onAbrirMarca(marca);
                      }}
                    >
                      {tituloMarca || marca || "Cliente"}
                    </button>
                  ) : (
                    <span className="task-sheet-breadcrumb__text">{tituloMarca || marca || "Cliente"}</span>
                  )}
                  <span className="task-sheet-breadcrumb__sep" aria-hidden="true">/</span>
                  <span className="task-sheet-breadcrumb__current" aria-current="page" title={nombre || "Subcliente"}>
                    {nombre || "Subcliente"}
                  </span>
                </nav>
              </div>

              <div className="relative px-6 md:px-10 pb-4 max-w-3xl mx-auto w-full">
                <h2 className="task-form-title w-full pr-8 text-2xl md:text-[1.75rem] font-bold text-[#37352F] leading-snug break-words whitespace-pre-wrap">
                  {nombre || "Sin nombre"}
                </h2>
              </div>

              <div className="max-w-3xl mx-auto w-full px-6 md:px-10 pb-4">
                <div className="pb-2 flex flex-col gap-0.5 border-b border-zinc-100">
                  <PropertyRowMacro icon="fa-regular fa-building" label="Cliente">
                    <span className={readOnlyClass}>{tituloMarca || "—"}</span>
                  </PropertyRowMacro>

                  <PropertyRowMacro icon="fa-solid fa-signal" label="Prioridad">
                    {soloLectura ? (
                      <span className={readOnlyClass}>
                        {(PRIORIDADES_MAPA || []).find((p) => p.id === prioridad)?.label || prioridad || "—"}
                      </span>
                    ) : (
                      <select
                        value={prioridad}
                        onChange={(e) => handlePrioridadChange(e.target.value)}
                        className={inputPropClass}
                        disabled={guardando}
                      >
                        {(PRIORIDADES_MAPA || [
                          { id: "Alta", label: "Alta" },
                          { id: "Media", label: "Media" },
                          { id: "Baja", label: "Baja" }
                        ]).map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    )}
                  </PropertyRowMacro>

                  <PropertyRowMacro icon="fa-solid fa-link" label="Enlace">
                    <div className="flex items-center gap-2 min-w-0">
                      {soloLectura ? (
                        <span className={`${readOnlyClass} truncate`}>{link || "—"}</span>
                      ) : (
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => handleLinkChange(e.target.value)}
                          placeholder="https://..."
                          className={inputPropTextClass}
                        />
                      )}
                      {typeof normalizarUrlEnlace === "function" && normalizarUrlEnlace(link) && (
                        <a
                          href={normalizarUrlEnlace(link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="task-link-open shrink-0 text-zinc-400 hover:text-blue-600 transition-colors"
                          title="Abrir enlace"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
                        </a>
                      )}
                    </div>
                  </PropertyRowMacro>
                </div>

                <div className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-ui-sm text-zinc-500">
                      <i className="fa-regular fa-square-check text-zinc-400 text-[11px]" />
                      <span>Subtareas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {subtareas.length > 0 && (
                        <span className="text-[11px] text-zinc-400 tabular-nums">
                          {completadas}/{subtareas.length}
                        </span>
                      )}
                      {!soloLectura && typeof onCrearEntregable === "function" && (
                        <button
                          type="button"
                          className="subcliente-add-btn"
                          title="Nuevo entregable en este subcliente"
                          aria-label={`Crear entregable en ${nombre}`}
                          onClick={() => {
                            const plantillaBase = typeof elegirPlantillaGrupo === "function"
                              ? elegirPlantillaGrupo(subtareas)
                              : (subtareas[0] || null);
                            onCrearEntregable({
                              ...(plantillaBase || {}),
                              marca,
                              subcliente: nombre,
                              prioridad
                            });
                          }}
                        >
                          <i className="fa-solid fa-plus" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {subtareas.length > 0 && (
                    <div className="h-0.5 bg-zinc-100 rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  )}

                  {subtareas.length === 0 ? (
                    <div className="py-2 flex flex-col gap-2">
                      <p className="text-ui-sm text-zinc-400">
                        Aún no hay entregables en este subcliente.
                      </p>
                      {!soloLectura && typeof onCrearEntregable === "function" && (
                        <button
                          type="button"
                          className="task-form-secondary-btn self-start"
                          onClick={() => onCrearEntregable({ marca, subcliente: nombre, prioridad })}
                        >
                          <i className="fa-solid fa-plus" aria-hidden="true" />
                          Crear entregable
                        </button>
                      )}
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-0.5">
                      {subtareas.map((t) => {
                        const titulo = typeof tituloDisplayTarea === "function"
                          ? tituloDisplayTarea(t)
                          : (t.info || "Sin título");
                        const estadoNorm = typeof normalizarEstado === "function"
                          ? normalizarEstado(t.estado)
                          : (t.estado || "Sin estado");
                        const cEstado = (typeof ESTADOS_MAPA !== "undefined" ? ESTADOS_MAPA : []).find(
                          (e) => (typeof cleanEstado === "function" ? cleanEstado(e.id) : e.id) === (typeof cleanEstado === "function" ? cleanEstado(t.estado) : t.estado)
                        ) || { dot: "bg-zinc-400" };
                        const prioridadT = typeof normalizarPrioridad === "function"
                          ? normalizarPrioridad(t.prioridad)
                          : t.prioridad;
                        return (
                          <li key={typeof getTaskSelectionKey === "function" ? getTaskSelectionKey(t) : (t.idTarea || titulo)}>
                            <button
                              type="button"
                              className="w-full flex items-center gap-2.5 py-2 px-1.5 -mx-1 rounded text-left hover:bg-zinc-50/80 transition-colors group"
                              onClick={() => {
                                if (typeof onAbrirTarea === "function") onAbrirTarea(t);
                              }}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${cEstado.dot}`} aria-hidden="true" />
                              <span className="flex-1 min-w-0 text-ui-sm text-[#37352F] truncate">
                                {titulo}
                              </span>
                              <span className="shrink-0 text-[11px] text-zinc-400">
                                {prioridadT || ""}
                              </span>
                              <span className="shrink-0 text-[11px] text-zinc-400 max-w-[7rem] truncate">
                                {estadoNorm}
                              </span>
                              <i className="fa-solid fa-chevron-right text-[10px] text-zinc-300 group-hover:text-zinc-500 shrink-0" aria-hidden="true" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="task-form-actions px-6 md:px-10 py-3 flex justify-end gap-2 max-w-3xl mx-auto w-full">
              <span className="text-[11px] text-zinc-400 min-w-[72px] text-right">
                {estadoGuardado === "saving" ? "Guardando…" : estadoGuardado === "saved" ? "Guardado" : estadoGuardado === "error" ? "No se pudo guardar" : ""}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="task-form-secondary-btn"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

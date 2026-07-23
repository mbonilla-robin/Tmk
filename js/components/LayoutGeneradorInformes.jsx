function SelectorPiezasTrade({ seleccionadas = [], onChange }) {
  const [catalogo, setCatalogo] = useState(() => cargarPiezasTrade());
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [nuevaCantidad, setNuevaCantidad] = useState(1);
  const [pegado, setPegado] = useState("");
  const [mostrarPegado, setMostrarPegado] = useState(false);
  const [msgPegado, setMsgPegado] = useState("");
  const wrapRef = useRef(null);

  const lista = parsePiezasSeleccionadas(seleccionadas);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtradas = useMemo(() => {
    const q = clavePiezaTrade(query);
    const ya = new Set(lista.map((p) => clavePiezaTrade(p.nombre)));
    return catalogo
      .filter((p) => !ya.has(clavePiezaTrade(p)))
      .filter((p) => !q || clavePiezaTrade(p).includes(q))
      .slice(0, 10);
  }, [catalogo, query, lista]);

  const agregar = (nombre, versiones = 1) => {
    const n = normalizarPiezaTrade(nombre);
    if (!n) return;
    const nextCat = agregarPiezaTrade(n);
    setCatalogo(nextCat);
    const key = clavePiezaTrade(n);
    const exists = lista.find((p) => clavePiezaTrade(p.nombre) === key);
    let next;
    if (exists) {
      next = lista.map((p) => (
        clavePiezaTrade(p.nombre) === key
          ? { ...p, versiones: (p.versiones || 1) + (Number(versiones) || 1) }
          : p
      ));
    } else {
      next = [...lista, { nombre: n, versiones: Math.max(1, Number(versiones) || 1) }];
    }
    onChange(next);
    setQuery("");
    setNuevaCantidad(1);
    setAbierto(false);
  };

  const aplicarPegado = () => {
    if (typeof aplicarPiezasDesdeTextoPegado !== "function") return;
    const { piezas, catalogo: nextCat, nuevas } = aplicarPiezasDesdeTextoPegado(pegado);
    if (!piezas.length) {
      setMsgPegado("No se detectaron piezas. Pega el listado numerado (con o sin (xN)).");
      return;
    }
    setCatalogo(nextCat);
    // Fusionar con las ya seleccionadas (suma versiones si se repite)
    const map = new Map(lista.map((p) => [clavePiezaTrade(p.nombre), { ...p }]));
    piezas.forEach((p) => {
      const key = clavePiezaTrade(p.nombre);
      const prev = map.get(key);
      if (prev) {
        map.set(key, { nombre: prev.nombre, versiones: (prev.versiones || 1) + (p.versiones || 1) });
      } else {
        map.set(key, { nombre: p.nombre, versiones: p.versiones || 1 });
      }
    });
    onChange(Array.from(map.values()));
    setPegado("");
    const nNuevas = nuevas.length;
    setMsgPegado(
      nNuevas > 0
        ? `Listo: ${piezas.length} piezas aplicadas · ${nNuevas} nuevas guardadas en catálogo.`
        : `Listo: ${piezas.length} piezas aplicadas.`
    );
  };

  const setVersiones = (nombre, versiones) => {
    const key = clavePiezaTrade(nombre);
    onChange(lista.map((p) => (
      clavePiezaTrade(p.nombre) === key
        ? { ...p, versiones: Math.max(1, Number(versiones) || 1) }
        : p
    )));
  };

  const quitar = (nombre) => {
    const key = clavePiezaTrade(nombre);
    onChange(lista.filter((p) => clavePiezaTrade(p.nombre) !== key));
  };

  const suma = typeof sumaVersionesPiezas === "function" ? sumaVersionesPiezas(lista) : 0;

  return (
    <div className="informe-piezas" ref={wrapRef}>
      <div className="informe-piezas__row">
        <div className="informe-piezas__search">
          <input
            className="informe-input"
            value={query}
            placeholder="Escribe o busca una pieza Trade…"
            onChange={(e) => {
              setQuery(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtradas[0]) agregar(filtradas[0], nuevaCantidad);
                else if (query.trim()) agregar(query, nuevaCantidad);
              }
            }}
          />
          {abierto && (filtradas.length > 0 || query.trim()) && (
            <ul className="informe-piezas__menu" role="listbox">
              {filtradas.map((p) => (
                <li key={p}>
                  <button type="button" onClick={() => agregar(p, nuevaCantidad)}>
                    {p}
                  </button>
                </li>
              ))}
              {query.trim() && !filtradas.some((p) => clavePiezaTrade(p) === clavePiezaTrade(query)) && (
                <li>
                  <button type="button" onClick={() => agregar(query, nuevaCantidad)}>
                    + Guardar «{normalizarPiezaTrade(query)}» en catálogo
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
        <input
          className="informe-input informe-input--qty"
          type="number"
          min="1"
          title="Versiones / cantidad al agregar"
          value={nuevaCantidad}
          onChange={(e) => setNuevaCantidad(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>

      <button
        type="button"
        className="informe-linkish"
        onClick={() => {
          setMostrarPegado((v) => !v);
          setMsgPegado("");
        }}
      >
        {mostrarPegado ? "Ocultar pegado de listado" : "Pegar listado completo de piezas"}
      </button>

      {mostrarPegado && (
        <div className="informe-piezas__paste">
          <textarea
            className="informe-textarea"
            rows={6}
            value={pegado}
            placeholder={"Ejemplo:\n1. Vinil Fachada.\n6. Floorgraphic Categorías (x5).\n12. Habladores Carnicería (x11)."}
            onChange={(e) => {
              setPegado(e.target.value);
              setMsgPegado("");
            }}
          />
          <div className="informe-piezas__paste-actions">
            <button type="button" className="informe-btn-ghost" onClick={aplicarPegado} disabled={!pegado.trim()}>
              Aplicar listado
            </button>
          </div>
          <p className="informe-hint">
            Detecta cantidades tipo (x5). Las piezas nuevas se guardan solas en el catálogo.
          </p>
          {msgPegado ? <p className="informe-hint informe-piezas__paste-msg">{msgPegado}</p> : null}
        </div>
      )}

      {lista.length > 0 && (
        <ul className="informe-piezas__lista">
          {lista.map((p) => (
            <li key={p.nombre}>
              <span>{p.nombre}</span>
              <label className="informe-piezas__ver">
                <span>× versiones</span>
                <input
                  type="number"
                  min="1"
                  value={p.versiones || 1}
                  onChange={(e) => setVersiones(p.nombre, e.target.value)}
                />
              </label>
              <button type="button" className="informe-btn-icon" onClick={() => quitar(p.nombre)} title="Quitar">
                <i className="fa-solid fa-xmark" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {suma > 0 && (
        <p className="informe-hint">
          Total automático de propuestas: <strong>{suma}</strong> (suma de versiones)
        </p>
      )}
    </div>
  );
}

function CampoEjeGestion({ eje, onChange, onRemove, tipoLabel }) {
  const patch = (partial) => onChange({ ...eje, ...partial });
  const piezas = parsePiezasSeleccionadas(eje.piezas || eje.trabajos || []);

  return (
    <div className="informe-eje-card">
      <div className="informe-eje-card__top">
        <span className="informe-eje-card__badge">{tipoLabel}</span>
        <button type="button" className="informe-btn-icon" onClick={onRemove} title="Quitar">
          <i className="fa-solid fa-trash" />
        </button>
      </div>

      <div className="informe-grid-2">
        <div className="informe-field">
          <label className="informe-field__label">Título</label>
          <input
            className="informe-input"
            value={eje.titulo}
            placeholder="Ej. Mundial Gama"
            onChange={(e) => patch({ titulo: e.target.value })}
          />
        </div>
        <div className="informe-field">
          <label className="informe-field__label">Mes de trabajo</label>
          <input
            className="informe-input"
            type="month"
            value={String(eje.fechaFin || "").slice(0, 7)}
            onChange={(e) => patch({ fechaFin: e.target.value })}
          />
        </div>
      </div>

      <div className="informe-field">
        <label className="informe-field__label">Qué se hizo (texto libre)</label>
        <textarea
          className="informe-textarea"
          rows={3}
          value={eje.notas || ""}
          placeholder="Describe el trabajo real: objetivo, impacto, qué se logró… No hace falta listar las piezas aquí."
          onChange={(e) => patch({ notas: e.target.value })}
        />
      </div>

      <div className="informe-field">
        <label className="informe-field__label">
          Texto desarrollado (PDF)
          {String(eje.redactado || "").trim() ? (
            <span className="informe-field__tag">Guardado</span>
          ) : null}
        </label>
        <textarea
          className="informe-textarea"
          rows={5}
          value={eje.redactado || ""}
          placeholder="Aquí queda la redacción del eje para el PDF (IA o manual). Se guarda en el borrador."
          onChange={(e) => patch({ redactado: e.target.value })}
        />
        <p className="informe-hint" style={{ marginTop: "0.25rem" }}>
          Este texto es el que aparece en la vista previa y el PDF. Se conserva al abrir el borrador.
        </p>
      </div>

      <div className="informe-field">
        <label className="informe-field__label">Piezas / trabajos</label>
        <SelectorPiezasTrade
          seleccionadas={piezas}
          onChange={(lista) => {
            const suma = sumaVersionesPiezas(lista);
            patch({
              piezas: lista,
              trabajos: serializarPiezasSeleccionadas(lista),
              propuestas: suma
            });
          }}
        />
      </div>

      <div className="informe-metrics-grid informe-metrics-grid--2">
        <div className="informe-field">
          <label className="informe-field__label">Propuestas</label>
          <input
            className="informe-input"
            type="number"
            min="0"
            value={eje.propuestas ?? 0}
            onChange={(e) => patch({ propuestas: Number(e.target.value) || 0 })}
          />
          <p className="informe-hint" style={{ marginTop: "0.25rem" }}>
            Se actualiza solo al sumar/cambiar versiones de piezas. Solo edítalo a mano si necesitas un ajuste puntual.
          </p>
        </div>
        <div className="informe-field">
          <label className="informe-field__label">Ejecutables realizados</label>
          <div className="informe-ejecutables-row">
            <input
              className="informe-input"
              type="number"
              min="0"
              disabled={Boolean(eje.enEjecucion)}
              value={eje.enEjecucion ? "" : (eje.ejecutablesHechos ?? 0)}
              placeholder={eje.enEjecucion ? "—" : "0"}
              onChange={(e) => patch({
                ejecutablesHechos: Number(e.target.value) || 0,
                enEjecucion: false
              })}
            />
            <button
              type="button"
              className={`informe-chip informe-chip--ejecucion${eje.enEjecucion ? " is-selected" : ""}`}
              onClick={() => patch({
                enEjecucion: !eje.enEjecucion,
                ejecutablesHechos: !eje.enEjecucion ? 0 : (eje.ejecutablesHechos ?? 0)
              })}
              title="Marcar el proyecto como aún en curso, sin ejecutables realizados"
            >
              En ejecución
            </button>
          </div>
          {eje.enEjecucion ? (
            <p className="informe-hint" style={{ marginTop: "0.25rem" }}>
              Proyecto en curso: en el PDF aparecerá «En ejecución» en lugar de un número de realizados.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function etiquetaStatusInforme(status) {
  if (typeof INFORME_STATUS_LABEL !== "undefined" && INFORME_STATUS_LABEL[status]) {
    return INFORME_STATUS_LABEL[status];
  }
  if (status === "con_ia") return "Con IA";
  if (status === "exportado") return "Exportado";
  return "Borrador";
}

function pasoInicialDesdeInforme(inf) {
  if (!inf) return 1;
  const tieneAi = typeof informeTieneRedaccionAi === "function"
    ? informeTieneRedaccionAi(inf)
    : Boolean(inf.aiGenerado);
  if (tieneAi) return 3;
  const tieneEjes = [...(inf.macros || []), ...(inf.micros || [])]
    .some((e) => e?.titulo || e?.notas || e?.redactado);
  return tieneEjes ? 2 : 1;
}

function LayoutGeneradorInformes({
  tareas = [],
  marcasDisponibles = [],
  onBack
}) {
  const [modo, setModo] = useState("home");
  const [listaInformes, setListaInformes] = useState([]);
  const [listaCargando, setListaCargando] = useState(true);
  const [listaError, setListaError] = useState("");
  const [borradorLocalPendiente, setBorradorLocalPendiente] = useState(null);
  const [subiendoLocal, setSubiendoLocal] = useState(false);
  const [informeId, setInformeId] = useState(null);
  const [statusGuardado, setStatusGuardado] = useState("borrador");
  const [paso, setPaso] = useState(1);
  const [informe, setInforme] = useState(() => crearInformeVacio("Gama"));
  const [informeVista, setInformeVista] = useState(null);
  const [guardadoAt, setGuardadoAt] = useState(null);
  const [guardandoNube, setGuardandoNube] = useState(false);
  const [sugerenciasDescartadas, setSugerenciasDescartadas] = useState(() => new Set());
  const [exportando, setExportando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [confirmAi, setConfirmAi] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [eliminandoId, setEliminandoId] = useState(null);
  const previewRef = useRef(null);
  const draftTimerRef = useRef(null);
  const skipFirstDraftSave = useRef(true);
  const informeIdRef = useRef(null);
  const statusRef = useRef("borrador");

  useEffect(() => {
    informeIdRef.current = informeId;
  }, [informeId]);

  useEffect(() => {
    statusRef.current = statusGuardado;
  }, [statusGuardado]);

  const cargarLista = useCallback(async () => {
    setListaCargando(true);
    setListaError("");
    try {
      if (typeof migrarBorradorLocalSiExiste === "function") {
        const mig = await migrarBorradorLocalSiExiste();
        if (mig?.migrated) {
          setMensaje("Borrador local subido a Informes");
          window.setTimeout(() => setMensaje(""), 2400);
        }
      }
      if (typeof listarInformes !== "function") {
        setListaInformes([]);
        setListaError("Store de informes no disponible");
        return;
      }
      const rows = await listarInformes();
      const lista = Array.isArray(rows) ? rows : [];
      setListaInformes(lista);
      if (typeof borradorLocalDistintoDeNube === "function") {
        setBorradorLocalPendiente(borradorLocalDistintoDeNube(lista));
      } else {
        setBorradorLocalPendiente(null);
      }
    } catch (err) {
      console.error(err);
      setListaError("No se pudieron cargar los informes");
      setListaInformes([]);
    } finally {
      setListaCargando(false);
    }
  }, []);

  useEffect(() => {
    if (modo !== "home") return undefined;
    cargarLista();
    return undefined;
  }, [modo, cargarLista]);

  useEffect(() => {
    if (modo !== "editor") return undefined;
    if (skipFirstDraftSave.current) {
      skipFirstDraftSave.current = false;
      return undefined;
    }
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(async () => {
      if (typeof guardarInformeEnNube !== "function") return;
      setGuardandoNube(true);
      try {
        const res = await guardarInformeEnNube(informeIdRef.current, informe, {
          prevStatus: statusRef.current
        });
        if (res?.ok && res.informe) {
          if (!informeIdRef.current && res.informe.id) {
            setInformeId(res.informe.id);
            informeIdRef.current = res.informe.id;
          }
          if (res.informe.status) {
            setStatusGuardado(res.informe.status);
            statusRef.current = res.informe.status;
          }
          setGuardadoAt(res.informe.updatedAt || new Date().toISOString());
        } else if (res && !res.ok) {
          console.warn("ROBIN: no se pudo guardar informe en nube", res.error);
          setMensaje(res.error?.includes("Usuario")
            ? "No se pudo guardar: inicia sesión"
            : "No se pudo guardar en la nube");
          window.setTimeout(() => setMensaje(""), 3200);
        }
      } finally {
        setGuardandoNube(false);
      }
    }, 600);
    return () => {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, [informe, modo]);

  const marcas = useMemo(() => {
    const base = Array.isArray(marcasDisponibles) ? marcasDisponibles.slice() : [];
    if (!base.some((m) => marcasCoinciden(m, "Gama"))) base.unshift("Gama");
    return base;
  }, [marcasDisponibles]);

  const accent = useMemo(() => {
    const st = typeof getMarcaStyle === "function" ? getMarcaStyle(informe.marca) : null;
    return st?.accent || "#71717a";
  }, [informe.marca]);

  const sugerenciasTareas = useMemo(() => {
    if (typeof sugerirAnexosDesdeTareas !== "function") return [];
    const desde = informe.mesDesde ? `${informe.mesDesde}-01` : "";
    const hasta = informe.mesHasta ? `${informe.mesHasta}-28` : "";
    return sugerirAnexosDesdeTareas(tareas, {
      marca: informe.marca,
      desde,
      hasta
    }).filter((s) => !sugerenciasDescartadas.has(s.id));
  }, [tareas, informe.marca, informe.mesDesde, informe.mesHasta, sugerenciasDescartadas]);

  const patch = (partial) => setInforme((prev) => ({ ...prev, ...partial }));

  const toast = (msg) => {
    setMensaje(msg);
    window.setTimeout(() => setMensaje(""), 2400);
  };

  const agregarMacro = () => patch({ macros: [...(informe.macros || []), crearEjeVacio("macro")] });
  const agregarMicro = () => patch({ micros: [...(informe.micros || []), crearEjeVacio("micro")] });

  const anexarSugerenciaTarea = (sug) => {
    const eje = {
      ...crearEjeVacio(sug.tipo === "micro" ? "micro" : "macro"),
      titulo: sug.eje,
      notas: (sug.titulos || []).join(". "),
      piezas: [],
      propuestas: Math.min(sug.count || 1, 12),
      ejecutablesHechos: Math.max(0, Math.round((sug.count || 1) * 0.75))
    };
    if (sug.tipo === "micro") patch({ micros: [...(informe.micros || []), eje] });
    else patch({ macros: [...(informe.macros || []), eje] });
    setSugerenciasDescartadas((prev) => new Set([...prev, sug.id]));
    toast(`Anexado: ${sug.eje}`);
  };

  const resumen = useMemo(() => (
    typeof resumenInformes === "function"
      ? resumenInformes(listaInformes)
      : {
        total: listaInformes.length,
        borrador: 0,
        con_ia: 0,
        exportado: 0,
        marcas: []
      }
  ), [listaInformes]);

  const tieneJunAgoEnLista = useMemo(() => (
    listaInformes.some((row) => {
      const p = row.payload || {};
      const ejes = [...(p.macros || []), ...(p.micros || [])];
      const titles = new Set(ejes.map((e) => String(e.titulo || "").toLowerCase().trim()));
      return titles.has("mundial gama") && titles.has("pricing")
        && row.mesDesde === "2026-06" && row.mesHasta === "2026-08";
    })
  ), [listaInformes]);

  const resetEditorState = (listo, { id = null, status = "borrador", updatedAt = null } = {}) => {
    skipFirstDraftSave.current = true;
    const norm = typeof normalizarInformeDesdeBorrador === "function"
      ? normalizarInformeDesdeBorrador(listo)
      : listo;
    setInforme(norm);
    setInformeId(id);
    informeIdRef.current = id;
    setStatusGuardado(status);
    statusRef.current = status;
    setGuardadoAt(updatedAt);
    setSugerenciasDescartadas(new Set());
    setConfirmAi(false);
    const tieneAi = typeof informeTieneRedaccionAi === "function"
      ? informeTieneRedaccionAi(norm)
      : Boolean(norm?.aiGenerado);
    if (tieneAi) {
      const vista = typeof prepararInformeParaVista === "function"
        ? prepararInformeParaVista(norm, { keepRedactado: true })
        : norm;
      setInformeVista(vista);
      setPaso(3);
    } else {
      setInformeVista(null);
      setPaso(pasoInicialDesdeInforme(norm));
    }
  };

  const subirBorradorLocal = async () => {
    if (typeof subirBorradorLocalComoNuevoInforme !== "function") {
      toast("No se puede subir el borrador local");
      return;
    }
    setSubiendoLocal(true);
    try {
      const res = await subirBorradorLocalComoNuevoInforme();
      if (res?.ok) {
        setBorradorLocalPendiente(null);
        toast("Borrador local subido a la nube");
        await cargarLista();
      } else {
        toast(res?.error || "No se pudo subir el borrador");
      }
    } finally {
      setSubiendoLocal(false);
    }
  };

  const irAlHome = () => {
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    setModo("home");
    setConfirmAi(false);
    setPreparando(false);
  };

  const crearNuevoInforme = () => {
    resetEditorState(crearInformeVacio("Gama"), { id: null, status: "borrador" });
    setPaso(1);
    setInformeVista(null);
    setModo("editor");
  };

  const abrirInformeDeLista = async (row) => {
    if (!row?.id) return;
    let data = row;
    if (typeof obtenerInforme === "function") {
      const fresh = await obtenerInforme(row.id);
      if (fresh) data = fresh;
    }
    resetEditorState(data.payload || crearInformeVacio(data.marca || "Gama"), {
      id: data.id,
      status: data.status || "borrador",
      updatedAt: data.updatedAt || null
    });
    setModo("editor");
    toast("Informe abierto");
  };

  const eliminarInformeDeLista = async (row, e) => {
    if (e) e.stopPropagation();
    if (!row?.id || typeof eliminarInforme !== "function") return;
    if (!window.confirm(`¿Eliminar el informe de ${formatearMarca(row.marca) || "sin marca"}?`)) return;
    setEliminandoId(row.id);
    try {
      const res = await eliminarInforme(row.id);
      if (!res?.ok) {
        toast(res?.error || "No se pudo eliminar");
        return;
      }
      setListaInformes((prev) => prev.filter((x) => x.id !== row.id));
      toast("Informe eliminado");
    } finally {
      setEliminandoId(null);
    }
  };

  const persistirAhora = async (listo, opts = {}) => {
    if (typeof guardarInformeEnNube !== "function") return null;
    setGuardandoNube(true);
    try {
      const res = await guardarInformeEnNube(informeIdRef.current, listo, {
        prevStatus: statusRef.current,
        ...opts
      });
      if (res?.ok && res.informe) {
        if (!informeIdRef.current && res.informe.id) {
          setInformeId(res.informe.id);
          informeIdRef.current = res.informe.id;
        }
        if (res.informe.status) {
          setStatusGuardado(res.informe.status);
          statusRef.current = res.informe.status;
        }
        setGuardadoAt(res.informe.updatedAt || new Date().toISOString());
      }
      return res;
    } finally {
      setGuardandoNube(false);
    }
  };

  const aplicarVistaPrevia = (listo, fuente) => {
    setInforme(listo);
    setInformeVista(listo);
    setPaso(3);
    setConfirmAi(false);
    persistirAhora(listo);
    toast(
      fuente === "gemini" || fuente === "groq"
        ? "Redactado con IA · guardado"
        : fuente === "cache"
          ? "Vista previa con redacción guardada"
          : "Textos organizados y ejes ordenados por mes"
    );
  };

  const ejecutarPreparacion = async ({ forzarAi = false } = {}) => {
    setPreparando(true);
    setConfirmAi(false);
    try {
      const yaTieneAi = typeof informeTieneRedaccionAi === "function"
        ? informeTieneRedaccionAi(informe)
        : Boolean(informe.aiGenerado);

      if (!forzarAi && yaTieneAi) {
        const listo = prepararInformeParaVista(informe, { keepRedactado: true });
        listo.aiGenerado = true;
        listo.aiGeneradoAt = informe.aiGeneradoAt || listo.aiGeneradoAt || new Date().toISOString();
        aplicarVistaPrevia(listo, "cache");
        return;
      }

      let listo;
      let fuente = "local";
      if (typeof prepararInformeConGemini === "function") {
        const res = await prepararInformeConGemini(informe);
        listo = res.informe;
        fuente = res.source || "local";
        if (res.ok && (fuente === "groq" || fuente === "gemini")) {
          listo = {
            ...listo,
            aiGenerado: true,
            aiGeneradoAt: new Date().toISOString()
          };
        } else if (!res.ok && res.error) {
          toast(`IA no disponible · ${res.error}`);
        }
      } else {
        listo = prepararInformeParaVista(informe);
      }
      aplicarVistaPrevia(listo, fuente);
    } catch (err) {
      console.error(err);
      const listo = prepararInformeParaVista(informe);
      aplicarVistaPrevia(listo, "local");
      toast("Vista previa lista (fallback local)");
    } finally {
      setPreparando(false);
    }
  };

  const irAVistaPrevia = () => {
    const yaTieneAi = typeof informeTieneRedaccionAi === "function"
      ? informeTieneRedaccionAi(informe)
      : Boolean(informe.aiGenerado);

    if (yaTieneAi) {
      setConfirmAi(true);
      return;
    }
    ejecutarPreparacion({ forzarAi: true });
  };

  const exportarPDF = async () => {
    const sheets = previewRef.current?.querySelectorAll(".informe-sheet:not(.informe-sheet--ghost)");
    if (!sheets || sheets.length === 0) return;
    setExportando(true);
    toast("Generando PDF…");

    const PAGE_W = 1080;
    const PAGE_H = 1920;

    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const waitImages = (root) => Promise.all(
      Array.from(root.querySelectorAll("img")).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })
    );

    const ensureInformeFonts = async () => {
      if (document.fonts?.load) {
        const faces = [
          '400 16px "Quicksand"',
          '500 16px "Quicksand"',
          '600 16px "Quicksand"',
          '700 16px "Quicksand"'
        ];
        await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
      }
      if (document.fonts?.ready) await document.fonts.ready;
    };

    /**
     * Captura a tamaño CSS real (mismo layout que la preview).
     * Tipografía embebida en base64 + métricas congeladas → mismo tamaño de letra.
     */
    const rasterizarHoja = async (sheet, fontEmbedCSS) => {
      const cssW = Math.max(1, Math.round(sheet.getBoundingClientRect().width));
      const cssH = Math.max(1, Math.round(sheet.getBoundingClientRect().height));
      // Solo nitidez: el layout NO se escala. pixelRatio no debe mezclarse con canvasWidth extra.
      const pixelRatio = Math.min(3, Math.max(2, PAGE_W / cssW));

      const prev = {
        borderRadius: sheet.style.borderRadius,
        boxShadow: sheet.style.boxShadow,
        transform: sheet.style.transform,
        zoom: sheet.style.zoom
      };
      sheet.classList.add("informe-sheet--export-capture");
      sheet.style.borderRadius = "0";
      sheet.style.boxShadow = "none";
      sheet.style.transform = "none";
      sheet.style.zoom = "1";

      const unfreeze =
        typeof freezeInformeTextMetrics === "function"
          ? freezeInformeTextMetrics(sheet)
          : () => {};

      await nextFrame();

      try {
        const htmlToImage = window.htmlToImage;
        if (htmlToImage && typeof htmlToImage.toCanvas === "function") {
          return await htmlToImage.toCanvas(sheet, {
            pixelRatio,
            cacheBust: true,
            // Nuestra CSS base64; no re-escanear Google Fonts (falla y cambia métricas)
            skipFonts: true,
            fontEmbedCSS: fontEmbedCSS || "",
            backgroundColor: "#9d2036",
            style: {
              transform: "none",
              zoom: "1",
              fontFamily: '"Quicksand", system-ui, sans-serif',
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact"
            }
          });
        }
        if (typeof html2canvas === "function") {
          return await html2canvas(sheet, {
            scale: pixelRatio,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#9d2036",
            logging: false,
            foreignObjectRendering: false,
            imageTimeout: 20000,
            width: cssW,
            height: cssH,
            windowWidth: cssW,
            windowHeight: cssH,
            scrollX: 0,
            scrollY: 0,
            onclone: (doc) => {
              if (fontEmbedCSS) {
                const style = doc.createElement("style");
                style.textContent = fontEmbedCSS;
                doc.head.appendChild(style);
              }
              const cloned = doc.querySelector(".informe-sheet--export-capture");
              if (cloned) {
                cloned.style.transform = "none";
                cloned.style.zoom = "1";
                cloned.style.fontFamily = '"Quicksand", system-ui, sans-serif';
                cloned.style.webkitPrintColorAdjust = "exact";
                cloned.style.printColorAdjust = "exact";
              }
            }
          });
        }
        throw new Error("Sin motor de captura");
      } finally {
        unfreeze();
        sheet.classList.remove("informe-sheet--export-capture");
        sheet.style.borderRadius = prev.borderRadius;
        sheet.style.boxShadow = prev.boxShadow;
        sheet.style.transform = prev.transform;
        sheet.style.zoom = prev.zoom;
      }
    };

    try {
      if (!window.jspdf?.jsPDF) {
        document.body.classList.add("informe-print-mode");
        window.print();
        document.body.classList.remove("informe-print-mode");
        toast("Usa «Guardar como PDF» en el diálogo");
        return;
      }

      await ensureInformeFonts();
      await waitImages(previewRef.current);
      await nextFrame();

      let fontEmbedCSS = "";
      try {
        if (typeof loadInformeFontEmbedCSS === "function") {
          fontEmbedCSS = await loadInformeFontEmbedCSS();
        }
        if (!fontEmbedCSS || !/Quicksand/i.test(fontEmbedCSS)) {
          console.warn("Export PDF: Quicksand no está embebida; el texto puede verse distinto");
        }
      } catch (fontErr) {
        console.warn("No se pudieron embeber tipografías del informe", fontErr);
      }

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [PAGE_W, PAGE_H],
        compress: false
      });

      for (let i = 0; i < sheets.length; i += 1) {
        const canvas = await rasterizarHoja(sheets[i], fontEmbedCSS);
        // PNG sin compresión agresiva: conserva rojo/blancos del fondo
        const img = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");
        pdf.addImage(img, "PNG", 0, 0, PAGE_W, PAGE_H, undefined, "NONE");
        toast(`Generando PDF… ${i + 1}/${sheets.length}`);
      }

      const marcaNombre = String(informe.marca || "Cliente").trim() || "Cliente";
      const hoy = new Date();
      const fechaArchivo = [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, "0"),
        String(hoy.getDate()).padStart(2, "0")
      ].join("-");
      const safePart = (s) => String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
      const fileName = `${safePart(marcaNombre)} - Informe entregables - ${fechaArchivo}.pdf`;
      pdf.save(fileName);
      await persistirAhora(informe, { markExported: true });
      toast(`PDF listo · ${sheets.length} pág.`);
    } catch (err) {
      console.error(err);
      document.body.classList.add("informe-print-mode");
      window.print();
      document.body.classList.remove("informe-print-mode");
      toast("Fallback: impresión del navegador (más fiel al preview)");
    } finally {
      setExportando(false);
    }
  };

  const rangoPreview = formatearRangoMesesInforme(informe.mesDesde, informe.mesHasta);
  const previewData = informe;

  const recuperarBorradorDesdePdf = async () => {
    if (typeof informeRecuperadoGamaJunAgo2026 !== "function") {
      toast("No hay recuperación disponible");
      return;
    }
    const listo = informeRecuperadoGamaJunAgo2026();
    resetEditorState(listo, { id: null, status: "con_ia" });
    setModo("editor");
    const res = await persistirAhora(listo, { status: "con_ia" });
    if (res?.ok) toast("Informe recuperado · Junio–Agosto 2026");
    else toast("Recuperado en editor (revisa la conexión)");
  };

  if (modo === "home") {
    return (
      <div className="informe-page informe-page--home">
        <header className="informe-page__topbar">
          {onBack && (
            <button type="button" className="informe-btn-back" onClick={onBack}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true" />
              Volver
            </button>
          )}
          <div className="informe-page__title-row">
            <div className="informe-home__title-block">
              <h1 className="informe-page__heading">Informes</h1>
              <p className="informe-home__lead">Entregables guardados en el workspace</p>
            </div>
            <button type="button" className="informe-btn-primary informe-btn-primary--home" onClick={crearNuevoInforme}>
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Nuevo
            </button>
          </div>
        </header>

        {mensaje && <div className="informe-toast">{mensaje}</div>}

        <div className="informe-home__stack">
          <section className="home-section informe-home__overview" aria-label="Resumen">
            <div className="home-section__head">
              <span className="home-section__title">Resumen</span>
            </div>
            <div className="informe-home__stats">
              <div className="informe-home__stat informe-home__stat--total">
                <span className="informe-home__stat-top">
                  <span className="informe-home__stat-dot" aria-hidden="true" />
                  <span className="informe-home__stat-label">Total</span>
                </span>
                <span className="informe-home__stat-value">{resumen.total}</span>
              </div>
              <div className="informe-home__stat informe-home__stat--borrador">
                <span className="informe-home__stat-top">
                  <span className="informe-home__stat-dot" aria-hidden="true" />
                  <span className="informe-home__stat-label">Borradores</span>
                </span>
                <span className="informe-home__stat-value">{resumen.borrador}</span>
              </div>
              <div className="informe-home__stat informe-home__stat--ia">
                <span className="informe-home__stat-top">
                  <span className="informe-home__stat-dot" aria-hidden="true" />
                  <span className="informe-home__stat-label">Con IA</span>
                </span>
                <span className="informe-home__stat-value">{resumen.con_ia}</span>
              </div>
              <div className="informe-home__stat informe-home__stat--exportado">
                <span className="informe-home__stat-top">
                  <span className="informe-home__stat-dot" aria-hidden="true" />
                  <span className="informe-home__stat-label">Exportados</span>
                </span>
                <span className="informe-home__stat-value">{resumen.exportado}</span>
              </div>
            </div>
          </section>

          {(resumen.marcas || []).length > 0 && (
            <div className="informe-home__marcas" aria-label="Marcas">
              {(resumen.marcas || []).slice(0, 5).map((m) => (
                <span key={m.nombre} className="informe-home__marca-chip">
                  {typeof formatearMarca === "function" ? formatearMarca(m.nombre) : m.nombre}
                  <span className="informe-home__marca-count">{m.count}</span>
                </span>
              ))}
            </div>
          )}

          {borradorLocalPendiente && (
            <div className="informe-recover-banner informe-recover-banner--local">
              <div>
                <strong>Borrador local distinto a la nube</strong>
                <span>
                  {borradorLocalPendiente.ejesCount} eje{borradorLocalPendiente.ejesCount === 1 ? "" : "s"}
                  {borradorLocalPendiente.titulos?.length
                    ? ` · ${borradorLocalPendiente.titulos.slice(0, 4).join(", ")}`
                    : ""}
                  {" · "}Este navegador tiene un informe que no está en el workspace. Súbelo como nuevo (no pisa el de la web).
                </span>
              </div>
              <button
                type="button"
                className="informe-btn-primary informe-btn-primary--sm"
                onClick={subirBorradorLocal}
                disabled={subiendoLocal}
              >
                {subiendoLocal ? "Subiendo…" : "Subir a la nube"}
              </button>
            </div>
          )}

          {!tieneJunAgoEnLista && typeof informeRecuperadoGamaJunAgo2026 === "function" && (
            <div className="informe-recover-banner">
              <div>
                <strong>Recuperar informe de ejemplo</strong>
                <span>Junio–Agosto 2026 · Mundial, Gamania, Pricing, Vinos (4 ejes de muestra)</span>
              </div>
              <button type="button" className="informe-btn-primary informe-btn-primary--sm" onClick={recuperarBorradorDesdePdf}>
                Recuperar ejemplo
              </button>
            </div>
          )}

          <section className="home-section informe-home__list-wrap">
            <div className="home-section__head">
              <div className="home-section__head-left">
                <span className="home-section__title">Todos los informes</span>
                {listaInformes.length > 0 && (
                  <span className="home-section__count">{listaInformes.length}</span>
                )}
              </div>
              <button
                type="button"
                className="home-section__link informe-home__refresh"
                onClick={cargarLista}
                disabled={listaCargando}
              >
                <i className={`fa-solid ${listaCargando ? "fa-spinner fa-spin" : "fa-rotate"}`} aria-hidden="true" />
                Actualizar
              </button>
            </div>

            {listaError && <p className="informe-hint informe-hint--error">{listaError}</p>}

            {listaCargando && listaInformes.length === 0 ? (
              <p className="informe-hint">Cargando informes…</p>
            ) : listaInformes.length === 0 ? (
              <button type="button" className="informe-home__empty" onClick={crearNuevoInforme}>
                <span className="informe-home__empty-title">Aún no hay informes</span>
                <span className="informe-home__empty-sub">Toca para crear el primero</span>
              </button>
            ) : (
              <ul className="informe-home__list">
                {listaInformes.map((row) => {
                  const rango = formatearRangoMesesInforme(row.mesDesde, row.mesHasta);
                  return (
                    <li key={row.id} className="informe-home__row">
                      <button
                        type="button"
                        className="informe-home__card"
                        onClick={() => abrirInformeDeLista(row)}
                      >
                        <div className="informe-home__card-main">
                          <div className="informe-home__card-top">
                            <strong>{typeof formatearMarca === "function" ? formatearMarca(row.marca) : row.marca}</strong>
                            <span className={`informe-home__status informe-home__status--${row.status}`}>
                              {etiquetaStatusInforme(row.status)}
                            </span>
                          </div>
                          <span className="informe-home__card-period">
                            {rango || "Sin periodo"}
                            {" · "}
                            {row.ejesCount} eje{row.ejesCount === 1 ? "" : "s"}
                          </span>
                          <span className="informe-home__card-meta">
                            {row.authorUsername ? `@${row.authorUsername}` : "Sin autor"}
                            {row.updatedAt
                              ? ` · ${typeof formatearFechaBorrador === "function" ? formatearFechaBorrador(row.updatedAt) : row.updatedAt}`
                              : ""}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="informe-home__delete"
                        title="Eliminar"
                        aria-label="Eliminar informe"
                        disabled={eliminandoId === row.id}
                        onClick={(e) => eliminarInformeDeLista(row, e)}
                      >
                        <i className={`fa-solid ${eliminandoId === row.id ? "fa-spinner fa-spin" : "fa-trash"}`} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="informe-page">
      <header className="informe-page__topbar">
        <button type="button" className="informe-btn-back" onClick={irAlHome}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Informes
        </button>
        <div className="informe-page__title-row">
          <h1 className="informe-page__heading">Informe entregables</h1>
          <span className={`informe-home__status informe-home__status--${statusGuardado}`}>
            {etiquetaStatusInforme(statusGuardado)}
          </span>
          <span className="informe-save-meta">
            {guardandoNube
              ? "Guardando…"
              : guardadoAt
                ? `Guardado · ${typeof formatearFechaBorrador === "function" ? formatearFechaBorrador(guardadoAt) : ""}`
                : "Sin guardar aún"}
          </span>
        </div>
      </header>

      {mensaje && <div className="informe-toast">{mensaje}</div>}

      {confirmAi && (
        <ModalPortal>
          <div className="informe-ai-modal" role="dialog" aria-modal="true" aria-labelledby="informe-ai-title">
            <div className="informe-ai-modal__card">
              <h3 id="informe-ai-title">Ya tienes una redacción con IA</h3>
              <p>
                Puedes continuar con la versión guardada (sin gastar tokens)
                o regenerar el texto con IA.
              </p>
              <div className="informe-ai-modal__actions">
                <button
                  type="button"
                  className="informe-btn-ghost"
                  disabled={preparando}
                  onClick={() => setConfirmAi(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="informe-btn-ghost"
                  disabled={preparando}
                  onClick={() => ejecutarPreparacion({ forzarAi: true })}
                >
                  Regenerar con IA
                </button>
                <button
                  type="button"
                  className="informe-btn-primary"
                  disabled={preparando}
                  onClick={() => ejecutarPreparacion({ forzarAi: false })}
                >
                  Continuar con la anterior
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <nav className="informe-steps" aria-label="Pasos">
        {[
          { n: 1, label: "Periodo" },
          { n: 2, label: "Ejes de gestión" },
          { n: 3, label: "Vista previa" }
        ].map((s) => (
          <button
            key={s.n}
            type="button"
            className={`informe-steps__item ${paso === s.n ? "is-active" : ""} ${paso > s.n ? "is-done" : ""}`}
            onClick={() => {
              if (s.n === 3) irAVistaPrevia();
              else setPaso(s.n);
            }}
          >
            <span>{s.n}</span>
            {s.label}
          </button>
        ))}
      </nav>

      <div className="informe-page__body">
        {paso === 1 && (
          <section className="informe-panel">
            <h2 className="informe-panel__title">Periodo del informe</h2>
            <p className="informe-panel__sub">
              El PDF mostrará el rango por meses. Los ejes se ordenan por fecha de finalización.
            </p>

            <div className="informe-field">
              <label className="informe-field__label">Marca / cliente</label>
              <div className="informe-chips">
                {marcas.map((m) => {
                  const sel = marcasCoinciden(m, informe.marca);
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`informe-chip ${sel ? "is-selected" : ""}`}
                      onClick={() => patch({ marca: m })}
                    >
                      {formatearMarca(m)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="informe-grid-2">
              <div className="informe-field">
                <label className="informe-field__label">Mes desde</label>
                <input
                  type="month"
                  className="informe-input"
                  value={informe.mesDesde || ""}
                  onChange={(e) => patch({ mesDesde: e.target.value })}
                />
              </div>
              <div className="informe-field">
                <label className="informe-field__label">Mes hasta</label>
                <input
                  type="month"
                  className="informe-input"
                  value={informe.mesHasta || ""}
                  onChange={(e) => patch({ mesHasta: e.target.value })}
                />
              </div>
            </div>

            {rangoPreview && (
              <p className="informe-rango-preview">
                En el PDF: <strong>{rangoPreview}</strong>
              </p>
            )}

            <div className="informe-panel__footer">
              <button type="button" className="informe-btn-primary" onClick={() => setPaso(2)}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {paso === 2 && (
          <div className="informe-split">
            <section className="informe-panel">
              <h2 className="informe-panel__title">Ejes de gestión</h2>
              <p className="informe-panel__sub">
                Fecha de cierre ordena el PDF. En piezas indica versiones (ej. 4 habladores).
              </p>

              <div className="informe-bloques">
                <div className="informe-bloques__head">
                  <h3>Macrotemporalidades</h3>
                  <button type="button" className="informe-btn-ghost" onClick={agregarMacro}>
                    <i className="fa-solid fa-plus" /> Agregar macro
                  </button>
                </div>
                {(informe.macros || []).length === 0 && <p className="informe-hint">Sin macros todavía.</p>}
                <div className="informe-bloques__list">
                  {(informe.macros || []).map((eje) => (
                    <CampoEjeGestion
                      key={eje.id}
                      eje={eje}
                      tipoLabel="Macro"
                      onChange={(next) => patch({ macros: informe.macros.map((x) => (x.id === eje.id ? next : x)) })}
                      onRemove={() => patch({ macros: informe.macros.filter((x) => x.id !== eje.id) })}
                    />
                  ))}
                </div>
              </div>

              <div className="informe-bloques">
                <div className="informe-bloques__head">
                  <h3>Microtemporalidades y proyectos especiales</h3>
                  <button type="button" className="informe-btn-ghost" onClick={agregarMicro}>
                    <i className="fa-solid fa-plus" /> Agregar micro
                  </button>
                </div>
                {(informe.micros || []).length === 0 && (
                  <p className="informe-hint">Eventualidades, fuera de FII, Pricing, Nida…</p>
                )}
                <div className="informe-bloques__list">
                  {(informe.micros || []).map((eje) => (
                    <CampoEjeGestion
                      key={eje.id}
                      eje={eje}
                      tipoLabel="Micro"
                      onChange={(next) => patch({ micros: informe.micros.map((x) => (x.id === eje.id ? next : x)) })}
                      onRemove={() => patch({ micros: informe.micros.filter((x) => x.id !== eje.id) })}
                    />
                  ))}
                </div>
              </div>

              <div className="informe-bloques">
                <div className="informe-bloques__head">
                  <h3>Sugerencias de mejora</h3>
                </div>
                <div className="informe-field">
                  <label className="informe-field__label">Notas del equipo</label>
                  <textarea
                    className="informe-textarea"
                    rows={8}
                    value={informe.sugerenciasNotas || ""}
                    placeholder={"Pega aquí el desarrollo completo. Puedes separar ideas con líneas en blanco o números.\nEjemplo:\n1. Fechas de assets: explicar el problema y el siguiente paso…\n\n2. Feedback entre equipos: …"}
                    onChange={(e) => patch({ sugerenciasNotas: e.target.value })}
                  />
                  <p className="informe-hint" style={{ marginTop: "0.25rem" }}>
                    Pega el desarrollo completo (párrafos y bullets). La IA debe pulirlo y ampliarlo un poco — no resumirlo. Usa «Regenerar con IA» para forzar el nuevo resultado.
                  </p>
                </div>
                {(informe.sugerenciasBullets || []).length > 0 && (
                  <div className="informe-field">
                    <label className="informe-field__label">
                      Sugerencias en el PDF
                      <span className="informe-field__tag">Guardadas</span>
                    </label>
                    <ul className="informe-sug-bullets-edit">
                      {(informe.sugerenciasBullets || []).map((s, i) => (
                        <li key={`sug-${i}`}>
                          <input
                            className="informe-input"
                            value={s.titulo || ""}
                            placeholder="Subtítulo de la sugerencia"
                            onChange={(e) => {
                              const next = (informe.sugerenciasBullets || []).map((item, idx) => (
                                idx === i ? { ...item, titulo: e.target.value } : item
                              ));
                              patch({ sugerenciasBullets: next });
                            }}
                          />
                          <textarea
                            className="informe-textarea"
                            rows={4}
                            value={s.text || ""}
                            placeholder="Texto desarrollado"
                            onChange={(e) => {
                              const next = (informe.sugerenciasBullets || []).map((item, idx) => (
                                idx === i ? { ...item, text: e.target.value } : item
                              ));
                              patch({ sugerenciasBullets: next });
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="informe-panel__footer">
                <button type="button" className="informe-btn-ghost" onClick={() => setPaso(1)}>Atrás</button>
                <button
                  type="button"
                  className="informe-btn-primary"
                  onClick={irAVistaPrevia}
                  disabled={preparando}
                >
                  {preparando ? "Organizando…" : "Vista previa"}
                </button>
              </div>
            </section>

            <aside className="informe-panel informe-panel--side">
              <h2 className="informe-panel__title">Sugerencias desde tareas</h2>
              <p className="informe-panel__sub">Opcional. Nada se anexa solo.</p>
              {sugerenciasTareas.length === 0 ? (
                <p className="informe-hint">Sin sugerencias para esta marca/periodo.</p>
              ) : (
                <ul className="informe-sug-list">
                  {sugerenciasTareas.map((s) => (
                    <li key={s.id} className="informe-sug">
                      <div className="informe-sug__meta">
                        <span className={`informe-sug__badge informe-sug__badge--${s.tipo}`}>{s.tipo}</span>
                        <strong>{s.eje}</strong>
                        <span className="informe-sug__count">{s.count}</span>
                      </div>
                      <p>{s.razon}</p>
                      <div className="informe-sug__actions">
                        <button type="button" className="informe-btn-primary informe-btn-primary--sm" onClick={() => anexarSugerenciaTarea(s)}>
                          Anexar
                        </button>
                        <button
                          type="button"
                          className="informe-btn-ghost"
                          onClick={() => setSugerenciasDescartadas((prev) => new Set([...prev, s.id]))}
                        >
                          Descartar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        )}

        {paso === 3 && (
          <section className="informe-panel informe-panel--preview">
            <div className="informe-preview-toolbar">
              <div>
                <h2 className="informe-panel__title">Vista previa</h2>
                <p className="informe-panel__sub">
                  Estilo clásico · páginas al tamaño del fondo · sin cortar tarjetas
                </p>
              </div>
              <div className="informe-preview-toolbar__actions">
                <button type="button" className="informe-btn-ghost" onClick={() => { setInformeVista(null); setPaso(2); }}>Editar</button>
                <button type="button" className="informe-btn-primary" onClick={exportarPDF} disabled={exportando}>
                  <i className={`fa-solid ${exportando ? "fa-spinner fa-spin" : "fa-file-pdf"}`} />
                  Descargar PDF
                </button>
              </div>
            </div>
            <div className="informe-preview-stage" ref={previewRef}>
              <VistaPreviaInformePDF informe={previewData} marcaAccent={accent} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

window.LayoutGeneradorInformes = LayoutGeneradorInformes;

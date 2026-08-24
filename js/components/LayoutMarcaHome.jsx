function MarcaInfoSubpagina({ metadata, nombreMarca, marcaEstilo, onVerFichaCliente }) {
  const tieneInfo =
    (metadata.clienteDirecto && metadata.clienteDirecto.trim()) ||
    (metadata.ejecutivos && metadata.ejecutivos.length > 0) ||
    (metadata.disenadores && metadata.disenadores.length > 0) ||
    (metadata.contentEquipo && metadata.contentEquipo.length > 0) ||
    (metadata.notas && metadata.notas.trim());

  return (
    <div className="marca-info-page">
      <div
        className="marca-info-card"
        style={{ borderLeftColor: marcaEstilo.accent }}
      >
        {!tieneInfo ? (
          <div className="marca-info-empty">
            <p>No hay información registrada para esta marca.</p>
            {onVerFichaCliente && (
              <button type="button" onClick={onVerFichaCliente} className="marca-info-edit-link">
                Ir a fichas de clientes →
              </button>
            )}
          </div>
        ) : (
          <div className="marca-info-sections">
            {metadata.clienteDirecto && metadata.clienteDirecto.trim() && (
              <div className="marca-info-block">
                <span className="marca-info-block-label">Cliente directo</span>
                <p className="marca-info-block-value">{metadata.clienteDirecto}</p>
              </div>
            )}
            <div className="marca-info-block">
              <span className="marca-info-block-label">Ejecutivos</span>
              {metadata.ejecutivos.length === 0 ? (
                <p className="marca-info-block-empty">Sin asignar</p>
              ) : (
                <ul className="marca-info-list">
                  {metadata.ejecutivos.map((p, i) => (
                    <li key={i}>{p.nombre}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="marca-info-block">
              <span className="marca-info-block-label">Diseño</span>
              {metadata.disenadores.length === 0 ? (
                <p className="marca-info-block-empty">Sin asignar</p>
              ) : (
                <ul className="marca-info-list">
                  {metadata.disenadores.map((p, i) => (
                    <li key={i}>
                      {p.nombre}
                      {p.tipo ? <span className="marca-info-list-meta"> · {p.tipo}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="marca-info-block">
              <span className="marca-info-block-label">Contenido</span>
              {metadata.contentEquipo.length === 0 ? (
                <p className="marca-info-block-empty">Sin asignar</p>
              ) : (
                <ul className="marca-info-list">
                  {metadata.contentEquipo.map((p, i) => (
                    <li key={i}>{p.nombre}</li>
                  ))}
                </ul>
              )}
            </div>
            {metadata.notas && metadata.notas.trim() && (
              <div className="marca-info-block marca-info-block--full">
                <span className="marca-info-block-label">Notas</span>
                <p className="marca-info-notas">{metadata.notas}</p>
              </div>
            )}
          </div>
        )}
        {tieneInfo && onVerFichaCliente && (
          <button type="button" onClick={onVerFichaCliente} className="marca-info-edit-link">
            Editar en fichas de clientes →
          </button>
        )}
      </div>
    </div>
  );
}

function scrollerPrincipalRobin() {
  return document.querySelector("[data-robin-content-main]");
}

function listaEntregablesVisible() {
  return Array.from(document.querySelectorAll(".notion-task-list")).find((nodo) => {
    const caja = nodo.getBoundingClientRect();
    return caja.width > 8 && caja.height > 8;
  }) || null;
}

function grupoSubclienteEnLista(nombre) {
  const lista = listaEntregablesVisible();
  if (!lista) return null;
  const clave = claveDomSubcliente(nombre);
  return Array.from(lista.querySelectorAll("[data-sub-clave]")).find((nodo) => (
    nodo.getAttribute("data-sub-clave") === clave
  )) || null;
}

function alinearGrupoEnScroller(el) {
  const scroller = scrollerPrincipalRobin();
  if (!el) return false;
  if (scroller) {
    const delta = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 10;
    if (Math.abs(delta) > 1) scroller.scrollTop += delta;
  } else {
    el.scrollIntoView({ block: "start", inline: "nearest" });
  }
  const scroller2 = scrollerPrincipalRobin();
  if (!scroller2) return true;
  const top = el.getBoundingClientRect().top - scroller2.getBoundingClientRect().top;
  return top >= -4 && top < 120;
}

function LayoutMarcaHome({
  marca,
  tareas,
  tareasFiltradas,
  widgets,
  marcasMetadata,
  username,
  onSelectTask,
  onUpdateField,
  onDeleteTask,
  getMarcaStyle,
  currentTheme,
  vistaModo,
  setVistaModo,
  listaAgrupacion,
  cambiarListaAgrupacion,
  filtroEstado,
  setFiltroEstado,
  filtroPrioridad,
  setFiltroPrioridad,
  filtroPersona,
  setFiltroPersona,
  filtroTiempo,
  setFiltroTiempo,
  searchQuery,
  setSearchQuery,
  listaPersonas,
  layoutTablaProps,
  dashboardMobileVista,
  setDashboardMobileVista,
  kanbanOrdenPrioridadActivo,
  alternarKanbanOrdenPrioridad,
  kanbanOrdenPrioridad,
  onVerFichaCliente,
  onLimpiarFiltros,
  listaSubclientes = [],
  mostrarEstatusGeneral = false,
  listaDisenadores = [],
  onEnviarCliente,
  onGuardarComentario,
  onCambiarEnvioTipo,
  onAbrirEstatus,
  onMarcarSubidoCor,
  onToast,
  subclienteDestino = null,
  onSubclienteDestinoConsumido
}) {
  const marcaEstilo = getMarcaStyle(marca);
  const nombreMarca = formatearMarca(marca);
  const gradienteHeader = useMemo(() => obtenerGradienteMarcaHeader(marca), [marca]);
  const metadata = useMemo(() => obtenerMetadataMarca(marcasMetadata, marca), [marcasMetadata, marca]);

  const [vistaSubpagina, setVistaSubpagina] = useState(null);
  const [filtroSubcliente, setFiltroSubcliente] = useState("TODOS");
  const [subclienteEnfocado, setSubclienteEnfocado] = useState("");
  const subclientePendienteRef = useRef("");

  const idBloqueSubcliente = (nombre) => {
    const clave = typeof claveSubcliente === "function"
      ? claveSubcliente(nombre)
      : String(nombre || "").toLowerCase();
    return `marca-subcliente-${String(clave).replace(/\s+/g, "-")}`;
  };

  const tareasMarca = useMemo(() => {
    return tareas.filter(t => marcasCoinciden(t.marca, marca));
  }, [tareas, marca]);

  const subclientesDisponibles = useMemo(
    () => listarSubclientesDisponiblesParaMarca(listaSubclientes, marca, tareasMarca),
    [listaSubclientes, marca, tareasMarca]
  );
  const tieneSubclientes = subclientesDisponibles.length > 0;

  useEffect(() => {
    setVistaSubpagina(null);
    setFiltroSubcliente("TODOS");
  }, [marca]);

  useEffect(() => {
    if (!subclienteDestino || !subclienteDestino.nombre) return undefined;
    const mismaMarca = typeof marcasCoinciden === "function"
      ? marcasCoinciden(marca, subclienteDestino.marca)
      : marca === subclienteDestino.marca;
    if (!mismaMarca) return undefined;
    const nombreDestino = subclientesDisponibles.find((n) => (
      typeof subclientesCoinciden === "function"
        ? subclientesCoinciden(n, subclienteDestino.nombre)
        : n === subclienteDestino.nombre
    )) || subclienteDestino.nombre;
    setVistaSubpagina(null);
    if (typeof setVistaModo === "function") setVistaModo("TABLE");
    setFiltroSubcliente(nombreDestino);
    subclientePendienteRef.current = nombreDestino;
    setSubclienteEnfocado(nombreDestino);

    let cancelado = false;
    const timers = [];
    const intentar = () => {
      if (cancelado || !subclientePendienteRef.current) return;
      const grupo = grupoSubclienteEnLista(nombreDestino);
      if (!grupo) return false;
      return alinearGrupoEnScroller(grupo);
    };
    [150, 320, 560, 900, 1300].forEach((ms) => {
      timers.push(window.setTimeout(() => {
        if (intentar()) {
          subclientePendienteRef.current = "";
          setSubclienteEnfocado("");
          if (typeof onSubclienteDestinoConsumido === "function") onSubclienteDestinoConsumido();
        }
      }, ms));
    });
    timers.push(window.setTimeout(() => {
      if (!subclientePendienteRef.current) return;
      subclientePendienteRef.current = "";
      setSubclienteEnfocado("");
      if (typeof onSubclienteDestinoConsumido === "function") onSubclienteDestinoConsumido();
    }, 1600));
    return () => {
      cancelado = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [subclienteDestino, marca]);

  const gruposSubclientes = useMemo(
    () => agruparTareasPorSubcliente(tareasMarca, marca),
    [tareasMarca, marca]
  );
  const tareasEntregablesMarca = useMemo(() => {
    const tHoy = obtenerTiempoHoyLocal();
    return tareasMarca.filter((t) => {
      const esCompletada = cleanEstado(t.estado) === "completada";
      if (esTareaSuspendida(t)) return false;

      if (filtroTiempo === "HOY") {
        if (!esRelevanteHoyTarea(t, tHoy)) return false;
      } else if (filtroTiempo === "ATRASADAS") {
        if (!cuentaComoAtrasada(t, tHoy)) return false;
      } else if (filtroTiempo === "FUTURAS") {
        const tDeadline = obtenerTiempoFecha(t.deadline);
        const esFutura = tDeadline !== Infinity && tDeadline > tHoy;
        if (!esFutura) return false;
      }

      if (filtroEstado !== "TODOS") {
        if (cleanEstado(t.estado) !== cleanEstado(filtroEstado)) return false;
      } else if (esCompletada) {
        return false;
      }
      if (filtroPrioridad !== "TODAS" && normalizarPrioridad(t.prioridad) !== normalizarPrioridad(filtroPrioridad)) return false;
      if (filtroPersona === "SIN_DISENADOR") {
        if (!tareaSinDisenadorAsignado(t)) return false;
      } else if (filtroPersona !== "TODAS" && !tareaIncluyePersonaFiltro(t.personas || "", filtroPersona)) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          (t.info || "").toLowerCase().includes(q) ||
          (t.detalles && (t.detalles || "").toLowerCase().includes(q)) ||
          (t.personas && (t.personas || "").toLowerCase().includes(q)) ||
          (t.categoria && (t.categoria || "").toLowerCase().includes(q)) ||
          (obtenerSubclienteTarea(t) || "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tareasMarca, filtroTiempo, filtroEstado, filtroPrioridad, filtroPersona, searchQuery]);

  const tareasVista = useMemo(() => {
    if (filtroSubcliente === "TODOS") return tareasEntregablesMarca;

    const delSub = (lista) => lista.filter((t) => (
      typeof subclientesCoinciden === "function"
        ? subclientesCoinciden(obtenerSubclienteTarea(t), filtroSubcliente)
        : obtenerSubclienteTarea(t) === filtroSubcliente
    ));

    const activos = delSub(tareasEntregablesMarca);
    if (activos.length > 0) return activos;

    // Subcliente filtrado sin activos: mostrar pausa/completadas solo en esta vista
    return delSub(tareasMarca).filter((t) => (
      (typeof esTareaCompletada === "function" && esTareaCompletada(t))
      || (typeof esTareaSuspendida === "function" && esTareaSuspendida(t))
    ));
  }, [tareasEntregablesMarca, tareasMarca, filtroSubcliente]);

  const tareasActivasMarca = useMemo(() => {
    return tareasMarca.filter(t => !esTareaCompletada(t) && !esTareaSuspendida(t)).length;
  }, [tareasMarca]);

  const stats = useMemo(() => {
    const total = tareasMarca.length;
    const completadas = tareasMarca.filter(t => cleanEstado(t.estado) === "completada").length;
    const enProgreso = tareasMarca.filter(t => cleanEstado(t.estado) === "en progreso").length;
    const tHoy = obtenerTiempoHoyLocal();
    const atrasadas = tareasMarca.filter(t => cuentaComoAtrasada(t, tHoy)).length;
    return { total, completadas, enProgreso, atrasadas };
  }, [tareasMarca]);

  const metricaCounters = useMemo(() => {
    const tHoy = obtenerTiempoHoyLocal();
    const entregasHoy = tareasMarca.filter(t => esEntregaHoyTarea(t, tHoy)).length;
    const trabajarHoy = tareasMarca.filter(t => esTrabajarHoyTarea(t, tHoy)).length;
    const activasHoy = entregasHoy + trabajarHoy;
    const atrasadas = tareasMarca.filter(t => cuentaComoAtrasada(t, tHoy)).length;
    return { activasHoy, atrasadas };
  }, [tareasMarca]);

  const highPriorityTasks = useMemo(() => {
    return tareasMarca
      .filter(t => esPrioridadAlta(t.prioridad) && !esTareaCompletada(t) && !esTareaSuspendida(t))
      .sort((a, b) => {
        const pesoA = getPriorityWeight(a.prioridad);
        const pesoB = getPriorityWeight(b.prioridad);
        if (pesoA !== pesoB) return pesoB - pesoA;
        return obtenerTiempoFecha(a.deadline) - obtenerTiempoFecha(b.deadline);
      });
  }, [tareasMarca]);

  const tareasSuspendidas = useMemo(() => {
    return tareasMarca
      .filter(t => esTareaSuspendida(t))
      .sort((a, b) => (a.info || "").localeCompare(b.info || "", "es"));
  }, [tareasMarca]);

  const widgetsMarca = useMemo(() => {
    return listarTodosWidgetsAplanados(filtrarWidgetsPorMarca(widgets, marca));
  }, [widgets, marca]);

  const filtrosEntregablesActivos =
    filtroEstado !== "TODOS" ||
    filtroPrioridad !== "TODAS" ||
    filtroPersona !== "TODAS" ||
    filtroTiempo !== "TODAS" ||
    filtroSubcliente !== "TODOS" ||
    searchQuery.trim() !== "";

  const chipsFiltrosActivos = useMemo(
    () => construirChipsFiltrosActivos({
      filtroTiempo,
      filtroEstado,
      filtroPrioridad,
      filtroPersona,
      searchQuery,
      filtroSubcliente,
      incluirSubcliente: true
    }),
    [filtroTiempo, filtroEstado, filtroPrioridad, filtroPersona, searchQuery, filtroSubcliente]
  );

  const quitarChipFiltro = (id) => {
    if (id === "tiempo") setFiltroTiempo("TODAS");
    else if (id === "estado") setFiltroEstado("TODOS");
    else if (id === "prioridad") setFiltroPrioridad("TODAS");
    else if (id === "persona") setFiltroPersona("TODAS");
    else if (id === "search") setSearchQuery("");
    else if (id === "subcliente") setFiltroSubcliente("TODOS");
  };

  const limpiarFiltrosLocales = () => {
    setFiltroSubcliente("TODOS");
    if (onLimpiarFiltros) onLimpiarFiltros();
  };

  const abrirEstatusMarca = () => {
    if (mostrarEstatusGeneral) {
      setVistaSubpagina("estatus");
      return;
    }
    if (typeof onAbrirEstatus === "function") onAbrirEstatus();
  };

  const mostrarLinkEstatus = mostrarEstatusGeneral || typeof onAbrirEstatus === "function";

  const marcaQuickNav = (
    <nav className="marca-home-quick-nav" aria-label="Accesos de marca">
      <span className="marca-home-quick-sep" aria-hidden="true">/</span>
      {mostrarLinkEstatus ? (
        <>
          <button
            type="button"
            onClick={abrirEstatusMarca}
            className={`marca-home-quick-link ${vistaSubpagina === "estatus" ? "is-active" : ""}`}
          >
            <SVGIcon.FileText className="marca-home-quick-icon" />
            <span>Estatus</span>
          </button>
          <span className="marca-home-quick-sep" aria-hidden="true">/</span>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => setVistaSubpagina("subclientes")}
        className={`marca-home-quick-link ${vistaSubpagina === "subclientes" ? "is-active" : ""}`}
      >
        <SVGIcon.Store className="marca-home-quick-icon" />
        <span>Subclientes</span>
      </button>
      <span className="marca-home-quick-sep" aria-hidden="true">/</span>
      <button
        type="button"
        onClick={() => setVistaSubpagina("info")}
        className={`marca-home-quick-link ${vistaSubpagina === "info" ? "is-active" : ""}`}
      >
        <SVGIcon.InfoCircle className="marca-home-quick-icon" />
        <span>Información</span>
      </button>
      <span className="marca-home-quick-sep" aria-hidden="true">/</span>
    </nav>
  );

  const entregablesToolbar = (
    <>
      <div className="marca-entregables-header">
        <div>
          <h3 className="marca-entregables-title">Entregables</h3>
          <p className="text-ui-sm text-zinc-400 mt-0.5">
            {tareasVista.length} activo{tareasVista.length !== 1 ? "s" : ""}
            {tareasVista.length !== tareasActivasMarca ? ` · ${tareasActivasMarca} en total` : ""}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => { setVistaModo("TABLE"); setUserPreference("vistaModo", "TABLE"); }}
            className={`px-2.5 py-1 text-ui-sm font-medium rounded transition-colors ${vistaModo === "TABLE" ? "bg-zinc-100 text-zinc-800" : "text-zinc-450 hover:text-zinc-700 hover:bg-zinc-50"}`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => { setVistaModo("KANBAN"); setUserPreference("vistaModo", "KANBAN"); }}
            className={`px-2.5 py-1 text-ui-sm font-medium rounded transition-colors ${vistaModo === "KANBAN" ? "bg-zinc-100 text-zinc-800" : "text-zinc-450 hover:text-zinc-700 hover:bg-zinc-50"}`}
          >
            Tablero
          </button>
        </div>
      </div>

      <div className="notion-dash-toolbar">
        <div className="notion-dash-filters">
          <div className="notion-dash-search">
            <i className="fa-solid fa-magnifying-glass notion-dash-search-icon" />
            <input
              type="text"
              placeholder="Buscar entregables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="notion-filter-select">
            <option value="TODOS">Estado</option>
            {obtenerEstadosFiltroLista().map(opt => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
          <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="notion-filter-select">
            <option value="TODAS">Prioridad</option>
            {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
          </select>
          <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="notion-filter-select">
            <option value="TODAS">Persona</option>
            {listaPersonas.map(p => (<option key={claveUnicaPersonaLista(p) || p} value={p}>{etiquetaDisplayListaPersona(p)}</option>))}
          </select>
          {tieneSubclientes && (
            <select value={filtroSubcliente} onChange={(e) => setFiltroSubcliente(e.target.value)} className="notion-filter-select">
              <option value="TODOS">Subcliente</option>
              {subclientesDisponibles.map((nombre) => (
                <option key={nombre} value={nombre}>{nombre}</option>
              ))}
            </select>
          )}
        </div>
        <div className="notion-time-pills">
          <button type="button" onClick={() => setFiltroTiempo("TODAS")} className={`notion-time-pill ${filtroTiempo === "TODAS" ? "is-active" : ""}`}>Todo</button>
          <button type="button" onClick={() => setFiltroTiempo("HOY")} className={`notion-time-pill ${filtroTiempo === "HOY" ? "is-active-blue" : ""}`}>Hoy{metricaCounters.activasHoy > 0 ? ` (${metricaCounters.activasHoy})` : ""}</button>
          <button type="button" onClick={() => setFiltroTiempo("ATRASADAS")} className={`notion-time-pill ${filtroTiempo === "ATRASADAS" ? "is-active-red" : ""}`}>Atrasados{metricaCounters.atrasadas > 0 ? ` (${metricaCounters.atrasadas})` : ""}</button>
          {vistaModo === "KANBAN" && filtroTiempo === "HOY" && (
            <button
              type="button"
              onClick={alternarKanbanOrdenPrioridad}
              className="notion-time-pill is-active-blue"
              title={kanbanOrdenPrioridad === "desc" ? "Prioridad: alta → media → baja" : "Prioridad: baja → media → alta"}
            >
              <i className={`fa-solid ${kanbanOrdenPrioridad === "desc" ? "fa-arrow-up" : "fa-arrow-down"}`}></i>
            </button>
          )}
        </div>
      </div>

      {vistaModo === "TABLE" && (
        <div className="lista-agrupacion-pills lista-agrupacion-pills--desktop">
          <span className="lista-agrupacion-label">Organizar por</span>
          <button
            type="button"
            onClick={() => cambiarListaAgrupacion("estado")}
            className={`lista-agrupacion-pill ${listaAgrupacion === "estado" ? "is-active" : ""}`}
          >
            Estado
          </button>
          <button
            type="button"
            onClick={() => cambiarListaAgrupacion("fecha")}
            className={`lista-agrupacion-pill ${listaAgrupacion === "fecha" ? "is-active" : ""}`}
          >
            Fecha
          </button>
        </div>
      )}
    </>
  );

  if (vistaSubpagina === "estatus") {
    return (
      <div className="marca-home marca-home--subpage animate-fade-in">
        <LayoutEstatusGeneral
          marca={marca}
          tareas={tareasMarca}
          onSelectTask={onSelectTask}
          onBack={() => setVistaSubpagina(null)}
          nombreMarca={nombreMarca}
          listaDisenadores={listaDisenadores}
          puedeEditar={typeof onEnviarCliente === "function"}
          onEnviarCliente={onEnviarCliente}
          onGuardarComentario={onGuardarComentario}
          onCambiarEnvioTipo={onCambiarEnvioTipo}
          onUpdateField={onUpdateField}
        />
      </div>
    );
  }

  if (vistaSubpagina === "info") {
    return (
      <div className="marca-home marca-home--subpage animate-fade-in">
        <MobileSubpageBar
          title="Info del cliente"
          onBack={() => setVistaSubpagina(null)}
          backLabel={nombreMarca}
        />
        <div className="robin-desktop-only marca-info-desktop-bar">
          <button type="button" onClick={() => setVistaSubpagina(null)} className="marca-info-desktop-back">
            <i className="fa-solid fa-chevron-left text-[10px]" />
            <span>{nombreMarca}</span>
          </button>
          <h2 className="marca-info-desktop-title">Info del cliente</h2>
        </div>
        <MarcaInfoSubpagina
          metadata={metadata}
          nombreMarca={nombreMarca}
          marcaEstilo={marcaEstilo}
          onVerFichaCliente={onVerFichaCliente}
        />
      </div>
    );
  }

  if (vistaSubpagina === "subclientes") {
    return (
      <div className="marca-home animate-fade-in">
        <MobileSubpageBar
          title="Subclientes"
          onBack={() => setVistaSubpagina(null)}
          backLabel={nombreMarca}
        />
        <div className="robin-desktop-only marca-info-desktop-bar">
          <button type="button" onClick={() => setVistaSubpagina(null)} className="marca-info-desktop-back">
            <i className="fa-solid fa-chevron-left text-[10px]" />
            <span>{nombreMarca}</span>
          </button>
          <h2 className="marca-info-desktop-title">Subclientes</h2>
        </div>
        <div className="marca-subclientes-page">
          {gruposSubclientes.length === 0 ? (
            <div className="marca-subclientes-empty">
              <p>No hay tareas con subcliente asignado en esta marca.</p>
              <p className="text-ui-sm text-zinc-400 mt-1">
                Asigna un subcliente al crear o editar un entregable.
              </p>
            </div>
          ) : (
            gruposSubclientes.map((grupo) => (
              <section key={grupo.nombre} id={idBloqueSubcliente(grupo.nombre)} className="marca-subcliente-block">
                <div className="marca-subcliente-block-header">
                  <h3 className="marca-subcliente-block-title">{grupo.nombre}</h3>
                  <span className="marca-subcliente-block-count">
                    {grupo.tareas.length} tarea{grupo.tareas.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="marca-subcliente-task-list">
                  {grupo.tareas.map((t) => {
                    const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400" };
                    return (
                      <li
                        key={getTaskSelectionKey(t)}
                        className="marca-subcliente-task-row"
                        onClick={() => onSelectTask(t)}
                      >
                        <span className="marca-subcliente-task-title">{t.info || "Sin título"}</span>
                        <span className="marca-subcliente-task-estado">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
                          {normalizarEstado(t.estado) || "Sin estado"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="marca-home animate-fade-in">
      <FiltrosActivosBar chips={chipsFiltrosActivos} onQuitar={quitarChipFiltro} />
      <header className="marca-home-hero" style={{ background: gradienteHeader }}>
        <div className="marca-home-hero-inner">
          <h1 className="marca-home-hero-title">{nombreMarca}</h1>
        </div>
      </header>

      <div className="marca-home-body">
        {marcaQuickNav}

        <div className="area-stat-card marca-glass-panel">
          <div className="area-stat-header">
            <span>Resumen de la marca</span>
          </div>
          <div className="area-stat-grid">
            <div className="area-stat-item">
              <span className="area-stat-label">Total</span>
              <span className="area-stat-value area-stat-value--total">{stats.total}</span>
            </div>
            <div className="area-stat-item">
              <span className="area-stat-label">Activos</span>
              <span className="area-stat-value area-stat-value--active">{stats.enProgreso}</span>
            </div>
            <div className="area-stat-item">
              <span className="area-stat-label">Listos</span>
              <span className="area-stat-value area-stat-value--done">{stats.completadas}</span>
            </div>
            <div className="area-stat-item">
              <span className="area-stat-label">Atraso</span>
              <span className="area-stat-value area-stat-value--late">{stats.atrasadas}</span>
            </div>
          </div>
        </div>

        <MarcaWidgetsStrip widgets={widgetsMarca} username={username} />

        {typeof PorSubirCorPanel === "function" && onMarcarSubidoCor ? (
          <PorSubirCorPanel
            tareas={tareasMarca}
            onSelectTask={onSelectTask}
            onMarcarSubidoCor={onMarcarSubidoCor}
            onToast={onToast}
            currentTheme={currentTheme}
            mostrarVacio={typeof marcasCoinciden === "function" ? marcasCoinciden(marca, "La Santé") : true}
            className="marca-glass-panel"
          />
        ) : null}

        <div className="marca-glass-panel marca-urgentes-panel overflow-hidden">
          <div className="home-priority-panel__header px-3 py-2.5 md:p-4 md:pb-3 flex items-center justify-between gap-2">
            <span className="mobile-section-label md:hidden">Urgentes</span>
            <span className="hidden md:block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Prioridad alta</span>
            {highPriorityTasks.length > 0 && (
              <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
                {highPriorityTasks.length}
              </span>
            )}
          </div>
          <div className="p-2 md:p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {highPriorityTasks.length === 0 ? (
                <div className="col-span-full py-5 text-center text-zinc-400 text-xs">
                  Sin urgentes en esta marca
                </div>
              ) : (
                highPriorityTasks.map(t => {
                  const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400" };
                  const personasCorta = t.personas
                    ? t.personas.split(/[\s,]+/).filter(Boolean).slice(0, 2).join(", ")
                    : "";
                  return (
                    <div
                      key={t.idTarea}
                      onClick={() => onSelectTask(t)}
                      className="urgent-task-card"
                      style={{ borderLeftColor: marcaEstilo.accent || "#71717a" }}
                    >
                      <div className="urgent-task-card-body">
                        <p className="urgent-task-card-title">{t.info}</p>
                        <div className="urgent-task-card-meta">
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot}`} />
                            <span className="truncate">{normalizarEstado(t.estado) || "Sin estado"}</span>
                          </span>
                          <span className="urgent-task-card-dot" aria-hidden="true">·</span>
                          <span className="truncate shrink-0">{formatearFecha(t.deadline)}</span>
                          {personasCorta && (
                            <>
                              <span className="urgent-task-card-dot" aria-hidden="true">·</span>
                              <span className="truncate">{personasCorta}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div id="marca-entregables" className="marca-entregables-section">
          <div className="robin-mobile-only flex-col gap-3">
            {dashboardMobileVista === "filtros" ? (
              <div className="flex flex-col gap-3">
                <MobileSubpageBar title="Filtros" onBack={() => setDashboardMobileVista("lista")} backLabel="Entregables" />
                <div className="border border-zinc-200 p-3 rounded-md flex flex-col gap-3 bg-white">
                  <div className="flex flex-col gap-3">
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                      <option value="TODOS">Todos los estados</option>
                      {obtenerEstadosFiltroLista().map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                    <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                      <option value="TODAS">Todas las prioridades</option>
                      {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </select>
                    <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                      <option value="TODAS">Todas las personas</option>
                      {listaPersonas.map(p => (<option key={claveUnicaPersonaLista(p) || p} value={p}>{etiquetaDisplayListaPersona(p)}</option>))}
                    </select>
                    {tieneSubclientes && (
                      <select value={filtroSubcliente} onChange={(e) => setFiltroSubcliente(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                        <option value="TODOS">Todos los subclientes</option>
                        {subclientesDisponibles.map((nombre) => (
                          <option key={nombre} value={nombre}>{nombre}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button onClick={() => setFiltroTiempo("TODAS")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "TODAS" ? "bg-[#37352F] text-white border-zinc-900" : "bg-white border-zinc-200 text-zinc-600"}`}>Todo</button>
                    <button onClick={() => setFiltroTiempo("HOY")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "HOY" ? "bg-blue-600 text-white border-blue-700" : "bg-white border-zinc-200 text-zinc-600"}`}>Hoy{metricaCounters.activasHoy > 0 ? ` (${metricaCounters.activasHoy})` : ""}</button>
                    <button onClick={() => setFiltroTiempo("ATRASADAS")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "ATRASADAS" ? "bg-red-600 text-white border-red-700" : "bg-white border-zinc-200 text-zinc-600"}`}>Atraso{metricaCounters.atrasadas > 0 ? ` (${metricaCounters.atrasadas})` : ""}</button>
                  </div>
                  {filtrosEntregablesActivos && (
                    <button type="button" onClick={limpiarFiltrosLocales} className="w-full py-2 text-ui-sm font-medium text-zinc-500 border border-zinc-200 rounded-md">
                      Limpiar filtros
                    </button>
                  )}
                  <button type="button" onClick={() => setDashboardMobileVista("lista")} className="w-full py-2.5 bg-[#37352F] text-white text-ui font-semibold rounded-md">
                    Ver {tareasVista.length} resultados
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mobile-dash-toolbar">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold truncate" style={{ color: marcaEstilo.accent }}>
                      Entregables
                    </h2>
                    <p className="text-[10px] text-zinc-400">
                      {tareasVista.length} resultado{tareasVista.length !== 1 ? "s" : ""}
                      {filtrosEntregablesActivos ? " · filtros activos" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setDashboardMobileVista("filtros")} className={`mobile-icon-btn ${filtrosEntregablesActivos ? "has-badge" : ""}`} title="Filtros">
                      <i className="fa-solid fa-filter"></i>
                    </button>
                    <button type="button" onClick={() => { setVistaModo("TABLE"); setUserPreference("vistaModo", "TABLE"); }} className={`mobile-icon-btn ${vistaModo === "TABLE" ? "is-active" : ""}`} title="Lista">
                      <i className="fa-solid fa-list"></i>
                    </button>
                    <button type="button" onClick={() => { setVistaModo("KANBAN"); setUserPreference("vistaModo", "KANBAN"); }} className={`mobile-icon-btn ${vistaModo === "KANBAN" ? "is-active" : ""}`} title="Tablero">
                      <i className="fa-solid fa-chart-simple"></i>
                    </button>
                  </div>
                </div>
                <div className="notion-dash-search">
                  <i className="fa-solid fa-magnifying-glass notion-dash-search-icon" />
                  <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {vistaModo === "TABLE" && (
                  <div className="lista-agrupacion-pills">
                    <span className="lista-agrupacion-label">Organizar por</span>
                    <button type="button" onClick={() => cambiarListaAgrupacion("estado")} className={`lista-agrupacion-pill ${listaAgrupacion === "estado" ? "is-active" : ""}`}>Estado</button>
                    <button type="button" onClick={() => cambiarListaAgrupacion("fecha")} className={`lista-agrupacion-pill ${listaAgrupacion === "fecha" ? "is-active" : ""}`}>Fecha</button>
                  </div>
                )}
                {vistaModo === "TABLE" ? (
                  <LayoutTablaAgrupada
                    {...layoutTablaProps}
                    tareas={tareasVista}
                    agruparPor={subclienteEnfocado || tieneSubclientes ? "subcliente" : "marca"}
                    subclienteEnfocado={subclienteEnfocado}
                  />
                ) : (
                  <LayoutKanban tareas={tareasVista} ordenPrioridad={kanbanOrdenPrioridadActivo} onUpdateField={onUpdateField} onSelectTask={onSelectTask} onDeleteTask={onDeleteTask} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
                )}
              </>
            )}
          </div>

          <div className="robin-desktop-only flex-col gap-4">
            {entregablesToolbar}
            {vistaModo === "TABLE" ? (
              <LayoutTablaAgrupada
                {...layoutTablaProps}
                tareas={tareasVista}
                agruparPor={subclienteEnfocado || tieneSubclientes ? "subcliente" : "marca"}
                subclienteEnfocado={subclienteEnfocado}
              />
            ) : (
              <LayoutKanban tareas={tareasVista} ordenPrioridad={kanbanOrdenPrioridadActivo} onUpdateField={onUpdateField} onSelectTask={onSelectTask} onDeleteTask={onDeleteTask} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
            )}
          </div>

          {tareasSuspendidas.length > 0 && dashboardMobileVista !== "filtros" && (
            <div className="marca-suspendidos-panel overflow-hidden">
              <div className="marca-suspendidos-panel__header px-0 py-2.5 md:py-3 flex items-center justify-between gap-2">
                <span className="mobile-section-label md:hidden">En pausa</span>
                <span className="hidden md:block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Proyectos en pausa</span>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                  {tareasSuspendidas.length}
                </span>
              </div>
              <div className="pb-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tareasSuspendidas.map(t => {
                    const personasCorta = t.personas
                      ? t.personas.split(/[\s,]+/).filter(Boolean).slice(0, 2).join(", ")
                      : "";
                    return (
                      <div
                        key={t.idTarea || t.info}
                        onClick={() => onSelectTask(t)}
                        className="suspendido-task-card"
                        style={{ borderLeftColor: marcaEstilo.accent || "#94a3b8" }}
                      >
                        <div className="suspendido-task-card-body">
                          <p className="suspendido-task-card-title">{t.info}</p>
                          <div className="suspendido-task-card-meta">
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-400" />
                              <span className="truncate">En pausa</span>
                            </span>
                            {personasCorta && (
                              <>
                                <span className="suspendido-task-card-dot" aria-hidden="true">·</span>
                                <span className="truncate">{personasCorta}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

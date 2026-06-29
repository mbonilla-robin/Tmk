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
              <span className="marca-info-block-label">Content</span>
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
  onLimpiarFiltros
}) {
  const marcaEstilo = getMarcaStyle(marca);
  const nombreMarca = formatearMarca(marca);
  const gradienteHeader = useMemo(() => obtenerGradienteMarcaHeader(marca), [marca]);
  const metadata = useMemo(() => obtenerMetadataMarca(marcasMetadata, marca), [marcasMetadata, marca]);

  const [vistaSubpagina, setVistaSubpagina] = useState(null);

  const tareasMarca = useMemo(() => {
    return tareas.filter(t => marcasCoinciden(t.marca, marca));
  }, [tareas, marca]);

  const tareasActivasMarca = useMemo(() => {
    return tareasMarca.filter(t => cleanEstado(t.estado) !== "completada").length;
  }, [tareasMarca]);

  const stats = useMemo(() => {
    const total = tareasMarca.length;
    const completadas = tareasMarca.filter(t => cleanEstado(t.estado) === "completada").length;
    const enProgreso = tareasMarca.filter(t => cleanEstado(t.estado) === "en progreso").length;
    const hoy = new Date();
    const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    const atrasadas = tareasMarca.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      return tDeadline !== Infinity && tDeadline < tHoy && cleanEstado(t.estado) !== "completada";
    }).length;
    return { total, completadas, enProgreso, atrasadas };
  }, [tareasMarca]);

  const metricaCounters = useMemo(() => {
    const tHoy = obtenerTiempoHoyLocal();
    const entregasHoy = tareasMarca.filter(t => esEntregaHoyTarea(t, tHoy)).length;
    const trabajarHoy = tareasMarca.filter(t => esTrabajarHoyTarea(t, tHoy)).length;
    const activasHoy = entregasHoy + trabajarHoy;
    const atrasadas = tareasMarca.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      return tDeadline !== Infinity && tDeadline < tHoy && cleanEstado(t.estado) !== "completada";
    }).length;
    return { activasHoy, atrasadas };
  }, [tareasMarca]);

  const highPriorityTasks = useMemo(() => {
    return tareasMarca
      .filter(t => esPrioridadAlta(t.prioridad) && cleanEstado(t.estado) !== "completada")
      .sort((a, b) => {
        const pesoA = getPriorityWeight(a.prioridad);
        const pesoB = getPriorityWeight(b.prioridad);
        if (pesoA !== pesoB) return pesoB - pesoA;
        return obtenerTiempoFecha(a.deadline) - obtenerTiempoFecha(b.deadline);
      });
  }, [tareasMarca]);

  const widgetsMarca = useMemo(() => {
    return listarTodosWidgetsAplanados(filtrarWidgetsPorMarca(widgets, marca));
  }, [widgets, marca]);

  const filtrosEntregablesActivos =
    filtroEstado !== "TODOS" ||
    filtroPrioridad !== "TODAS" ||
    filtroPersona !== "TODAS" ||
    filtroTiempo !== "TODAS" ||
    searchQuery.trim() !== "";

  const entregablesToolbar = (
    <>
      <div className="marca-entregables-header">
        <div>
          <h3 className="marca-entregables-title">Entregables</h3>
          <p className="text-ui-sm text-zinc-400 mt-0.5">
            {tareasFiltradas.length} activo{tareasFiltradas.length !== 1 ? "s" : ""}
            {tareasFiltradas.length !== tareasActivasMarca ? ` · ${tareasActivasMarca} en total` : ""}
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
            {LISTA_ESTADOS_VALIDOS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
          <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="notion-filter-select">
            <option value="TODAS">Prioridad</option>
            {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
          </select>
          <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="notion-filter-select">
            <option value="TODAS">Persona</option>
            {listaPersonas.map(p => (<option key={p} value={p}>{p}</option>))}
          </select>
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

  if (vistaSubpagina === "info") {
    return (
      <div className="marca-home animate-fade-in">
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

  return (
    <div className="marca-home animate-fade-in">
      <header className="marca-home-hero" style={{ background: gradienteHeader }}>
        <div className="marca-home-hero-inner">
          <span className="marca-home-hero-spacer" aria-hidden="true" />
          <h1 className="marca-home-hero-title">{nombreMarca}</h1>
          <button
            type="button"
            onClick={() => setVistaSubpagina("info")}
            className="marca-home-info-btn"
            title="Ver información del cliente"
            aria-label="Ver información del cliente"
          >
            <i className="fa-solid fa-circle-info" />
          </button>
        </div>
      </header>

      <div className="marca-home-body">
        <div className="area-stat-card">
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

        <div className={`home-priority-panel border ${currentTheme.border} rounded-md ${currentTheme.cardBg} overflow-hidden`}>
          <div className={`home-priority-panel__header px-3 py-2.5 md:p-4 md:pb-3 border-b ${currentTheme.border} flex items-center justify-between gap-2`}>
            <span className="mobile-section-label md:hidden">Urgentes</span>
            <span className="hidden md:block text-[10px] font-semibold text-zinc-500">Prioridad alta</span>
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
                          <span className="truncate shrink-0">{t.deadline ? formatearFecha(t.deadline) : "Sin fecha"}</span>
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

        <div className="marca-entregables-section">
          <div className="robin-mobile-only flex-col gap-3">
            {dashboardMobileVista === "filtros" ? (
              <div className="flex flex-col gap-3">
                <MobileSubpageBar title="Filtros" onBack={() => setDashboardMobileVista("lista")} backLabel="Entregables" />
                <div className="border border-zinc-200 p-3 rounded-md flex flex-col gap-3 bg-white">
                  <div className="flex flex-col gap-3">
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                      <option value="TODOS">Todos los estados</option>
                      {LISTA_ESTADOS_VALIDOS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                    <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                      <option value="TODAS">Todas las prioridades</option>
                      {PRIORIDADES_MAPA.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                    </select>
                    <select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)} className="w-full bg-white border border-zinc-200 p-2 text-ui rounded text-zinc-600">
                      <option value="TODAS">Todas las personas</option>
                      {listaPersonas.map(p => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button onClick={() => setFiltroTiempo("TODAS")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "TODAS" ? "bg-[#37352F] text-white border-zinc-900" : "bg-white border-zinc-200 text-zinc-600"}`}>Todo</button>
                    <button onClick={() => setFiltroTiempo("HOY")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "HOY" ? "bg-blue-600 text-white border-blue-700" : "bg-white border-zinc-200 text-zinc-600"}`}>Hoy{metricaCounters.activasHoy > 0 ? ` (${metricaCounters.activasHoy})` : ""}</button>
                    <button onClick={() => setFiltroTiempo("ATRASADAS")} className={`px-2 py-2 rounded text-[10px] font-semibold border ${filtroTiempo === "ATRASADAS" ? "bg-red-600 text-white border-red-700" : "bg-white border-zinc-200 text-zinc-600"}`}>Atraso{metricaCounters.atrasadas > 0 ? ` (${metricaCounters.atrasadas})` : ""}</button>
                  </div>
                  {filtrosEntregablesActivos && onLimpiarFiltros && (
                    <button type="button" onClick={onLimpiarFiltros} className="w-full py-2 text-ui-sm font-medium text-zinc-500 border border-zinc-200 rounded-md">
                      Limpiar filtros
                    </button>
                  )}
                  <button type="button" onClick={() => setDashboardMobileVista("lista")} className="w-full py-2.5 bg-[#37352F] text-white text-ui font-semibold rounded-md">
                    Ver {tareasFiltradas.length} resultados
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
                      {tareasFiltradas.length} resultado{tareasFiltradas.length !== 1 ? "s" : ""}
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
                  <LayoutTablaAgrupada {...layoutTablaProps} />
                ) : (
                  <LayoutKanban tareas={tareasFiltradas} ordenPrioridad={kanbanOrdenPrioridadActivo} onUpdateField={onUpdateField} onSelectTask={onSelectTask} onDeleteTask={onDeleteTask} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
                )}
              </>
            )}
          </div>

          <div className="robin-desktop-only flex-col gap-4">
            {entregablesToolbar}
            {vistaModo === "TABLE" ? (
              <LayoutTablaAgrupada {...layoutTablaProps} />
            ) : (
              <LayoutKanban tareas={tareasFiltradas} ordenPrioridad={kanbanOrdenPrioridadActivo} onUpdateField={onUpdateField} onSelectTask={onSelectTask} onDeleteTask={onDeleteTask} getMarcaStyle={getMarcaStyle} currentTheme={currentTheme} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

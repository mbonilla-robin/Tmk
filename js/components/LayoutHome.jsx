function LayoutHome({
  tareas,
  nombreUsuario,
  username,
  onSelectTask,
  onUpdateField,
  widgets,
  onAbrirEstatus,
  onAbrirEquipos,
  onAbrirInformes,
  onVerTodasHoy,
  onCrearRapido,
  onAtajoFiltro,
  soloMisTareas = false,
  currentTheme,
  getMarcaStyle,
  otrosUsuariosEnLinea,
  presenceEstado,
  noticiasTmk,
  cargandoNoticiasTmk,
  onSelectNoticiaTmk,
  onAbrirPublicarTmkNews,
  onAbrirTmkNews
}) {

  const widgetsVisibles = useMemo(() => agruparWidgetsPorSeccion(widgets), [widgets]);
  const todosLosWidgets = useMemo(
    () => listarTodosWidgetsAplanados(widgetsVisibles),
    [widgetsVisibles]
  );
  const [widgetsMobileVista, setWidgetsMobileVista] = useState("inicio");

  useEffect(() => {
    const abrirAccesos = () => setWidgetsMobileVista("todos");
    const cerrarAccesos = () => setWidgetsMobileVista("inicio");
    window.addEventListener("induccion-abrir-accesos", abrirAccesos);
    window.addEventListener("induccion-cerrar-accesos", cerrarAccesos);
    return () => {
      window.removeEventListener("induccion-abrir-accesos", abrirAccesos);
      window.removeEventListener("induccion-cerrar-accesos", cerrarAccesos);
    };
  }, []);

  const stats = useMemo(() => {
    const total = tareas.length;
    const completadas = tareas.filter(t => cleanEstado(t.estado) === "completada").length;
    const enProgreso = tareas.filter(t => cleanEstado(t.estado) === "en progreso").length;

    const hoy = new Date();
    const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    const atrasadas = tareas.filter(t => cuentaComoAtrasada(t, tHoy)).length;

    return { total, completadas, enProgreso, atrasadas };
  }, [tareas]);

  const highPriorityTasks = useMemo(() => {
    return tareas
      .filter(t => esPrioridadAlta(t.prioridad) && !esTareaCompletada(t) && !esTareaSuspendida(t))
      .sort((a, b) => {
        const pesoA = getPriorityWeight(a.prioridad);
        const pesoB = getPriorityWeight(b.prioridad);
        if (pesoA !== pesoB) return pesoB - pesoA;
        const fechaA = obtenerTiempoFecha(a.deadline);
        const fechaB = obtenerTiempoFecha(b.deadline);
        return fechaA - fechaB;
      });
  }, [tareas]);

  const saludo = formatearNombrePresencia({ username, nombre: nombreUsuario || `@${username}` });
  const primerNombre = String(saludo).trim().split(/\s+/)[0] || saludo;
  const fechaHoy = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
  const fechaLabel = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  const handleStatTap = (tipo) => {
    if (!onAtajoFiltro) return;
    onAtajoFiltro(tipo);
  };

  const renderUrgentesDesktop = () => (
    <div className={`home-priority-panel border ${currentTheme.border} rounded-md ${currentTheme.cardBg} overflow-hidden`} data-induccion="urgentes">
      <div className={`home-priority-panel__header px-3 py-2.5 md:p-4 md:pb-3 border-b ${currentTheme.border} flex items-center justify-between gap-2`}>
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
              Sin urgentes
            </div>
          ) : (
            highPriorityTasks.map(t => {
              const cMarca = getMarcaStyle(t.marca);
              const cEstado = ESTADOS_MAPA.find(e => cleanEstado(e.id) === cleanEstado(t.estado)) || { dot: "bg-zinc-400" };
              const personasCorta = t.personas
                ? t.personas.split(/[\s,]+/).filter(Boolean).slice(0, 2).join(", ")
                : "";

              return (
                <div
                  key={t.idTarea}
                  onClick={() => onSelectTask(t)}
                  className="urgent-task-card"
                  style={{ borderLeftColor: cMarca.accent || "#71717a" }}
                >
                  <div className="urgent-task-card-body">
                    <p className="urgent-task-card-title">{t.info}</p>
                    <div className="urgent-task-card-meta">
                      <span
                        className="urgent-task-card-marca"
                        style={{ color: cMarca.accent || "#71717a" }}
                      >
                        {formatearMarca(t.marca)}
                      </span>
                      <span className="urgent-task-card-dot" aria-hidden="true">·</span>
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
  );

  return (
    <div className="flex flex-col gap-4 md:gap-4 animate-fade-in home-layout">
      {widgetsMobileVista === "todos" && (
        <div className="md:hidden flex flex-col gap-3 px-4">
          <MobileSubpageBar
            title="Accesos rápidos"
            onBack={() => setWidgetsMobileVista("inicio")}
            backLabel="Home"
          />
          <MobileWidgetsGrid
            variant="full"
            widgetsAgrupados={widgetsVisibles}
            username={username}
            onEstatus={onAbrirEstatus}
            onEquipos={onAbrirEquipos}
            onInformes={onAbrirInformes}
            onTmkNews={onAbrirTmkNews}
          />
        </div>
      )}

      <div className={`flex flex-col gap-4 md:gap-5 ${widgetsMobileVista === "todos" ? "hidden md:flex" : ""}`}>
        {/* —— Móvil: nuevo layout —— */}
        <div className="home-mobile-stack md:hidden">
          <HomeTmkNews
            noticias={noticiasTmk}
            loading={cargandoNoticiasTmk}
            onSelectNoticia={onSelectNoticiaTmk}
            onAbrirPublicar={onAbrirPublicarTmkNews}
          />

          <HomeMobileCommandCenter
            fechaLabel={fechaLabel}
            primerNombre={primerNombre}
          />

          <HomePresenceChip
            saludo={saludo}
            otrosUsuariosEnLinea={otrosUsuariosEnLinea}
            presenceEstado={presenceEstado}
          />

          <HomeAreaStats stats={stats} onStatTap={handleStatTap} className="md:hidden" />

          {onVerTodasHoy !== undefined && (
            <HomeMiDiaMobile
              tareas={tareas}
              username={username}
              onSelectTask={onSelectTask}
              getMarcaStyle={getMarcaStyle}
              soloMisTareas={soloMisTareas}
              onVerTodasHoy={onVerTodasHoy}
            />
          )}

          <HomeUrgentesCarousel
            tareas={highPriorityTasks}
            onSelectTask={onSelectTask}
            getMarcaStyle={getMarcaStyle}
            onVerTodas={onAtajoFiltro ? () => onAtajoFiltro("urgentes") : undefined}
          />

          {(widgetsVisibles.robin.length > 0 || widgetsVisibles.clientes.length > 0) && (
            <div className="home-section md:hidden induccion-accesos-target" data-induccion="accesos-rapidos">
              <div className="home-section__head">
                <span className="home-section__title">Accesos rápidos</span>
              </div>
              <MobileWidgetsGrid
                widgets={todosLosWidgets}
                variant="preview"
                username={username}
                onVerMas={() => setWidgetsMobileVista("todos")}
                onEstatus={onAbrirEstatus}
                onEquipos={onAbrirEquipos}
                onInformes={onAbrirInformes}
                onTmkNews={onAbrirTmkNews}
              />
            </div>
          )}

          <HomeCronogramaSemana
            tareas={tareas}
            onSelectTask={onSelectTask}
            getMarcaStyle={getMarcaStyle}
          />
        </div>

        {/* —— Desktop —— */}
        <div className="hidden md:flex flex-col gap-4">
          <HomeTmkNews
            variant="desktop"
            noticias={noticiasTmk}
            loading={cargandoNoticiasTmk}
            onSelectNoticia={onSelectNoticiaTmk}
            onAbrirPublicar={onAbrirPublicarTmkNews}
          />

          {(widgetsVisibles.robin.length > 0 || widgetsVisibles.clientes.length > 0) && (
            <DesktopWidgetsPanel widgetsAgrupados={widgetsVisibles} username={username} />
          )}

          {renderUrgentesDesktop()}

          <HomeAreaStats
            stats={stats}
            onStatTap={handleStatTap}
            variant="desktop"
            className="hidden md:block"
          />

          <div className="w-full">
            <CalendarioNotion
              tareas={tareas}
              onSelectTask={onSelectTask}
              getMarcaStyle={getMarcaStyle}
              username={username}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

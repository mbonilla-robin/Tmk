function LayoutHome({
  tareas,
  nombreUsuario,
  username,
  onSelectTask,
  onUpdateField,
  widgets,
  onAbrirEstatus,
  onAbrirEquipos,
  currentTheme,
  getMarcaStyle,
  otrosUsuariosEnLinea,
  presenceEstado
}) {

  const widgetsVisibles = useMemo(() => agruparWidgetsPorSeccion(widgets), [widgets]);
  const todosLosWidgets = useMemo(
    () => listarTodosWidgetsAplanados(widgetsVisibles),
    [widgetsVisibles]
  );
  const [widgetsMobileVista, setWidgetsMobileVista] = useState("inicio");

  const stats = useMemo(() => {
    const total = tareas.length;
    const completadas = tareas.filter(t => cleanEstado(t.estado) === "completada").length;
    const enProgreso = tareas.filter(t => cleanEstado(t.estado) === "en progreso").length;
    
    const hoy = new Date();
    const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    const atrasadas = tareas.filter(t => {
      const tDeadline = obtenerTiempoFecha(t.deadline);
      return tDeadline !== Infinity && tDeadline < tHoy && cleanEstado(t.estado) !== "completada";
    }).length;

    return { total, completadas, enProgreso, atrasadas };
  }, [tareas]);

  const highPriorityTasks = useMemo(() => {
    return tareas
      .filter(t => esPrioridadAlta(t.prioridad) && cleanEstado(t.estado) !== "completada")
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

  return (
    <div className="flex flex-col gap-4 md:gap-5 animate-fade-in">
      <div className="hidden md:block border-b border-zinc-150 pb-2.5">
        <h2 className="text-xl font-extrabold text-[#37352F] tracking-tight">Home</h2>
      </div>

      {widgetsMobileVista === "todos" && (
        <div className="md:hidden flex flex-col gap-3">
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
          />
        </div>
      )}

      <div className={`flex flex-col gap-4 md:gap-5 ${widgetsMobileVista === "todos" ? "hidden md:flex" : ""}`}>
      <div className="md:hidden">
        <h2 className="text-lg font-bold text-[#37352F]">Hola, {saludo}</h2>
        <p className="text-[11px] text-zinc-400 mt-0.5">Resumen de tu área</p>
      </div>

      <div className="md:hidden mobile-presence-card">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide">Equipo en línea</span>
          <span className="text-[10px] font-medium text-zinc-400">
            {presenceEstado === "connecting" ? "Conectando..." : presenceEstado === "error" ? "Sin conexión" : "Activo"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-semibold text-[#37352F]">Tú ({saludo})</span>
        </div>

        {presenceEstado === "ready" && otrosUsuariosEnLinea.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-zinc-100">
            <p className="text-[10px] text-zinc-400 mb-1.5">También conectados:</p>
            <div className="flex flex-wrap gap-1.5">
              {otrosUsuariosEnLinea.map((u, index) => (
                <span
                  key={u.uid || `user-${index}`}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full px-2 py-0.5"
                  title={formatearNombrePresencia(u)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {formatearNombrePresencia(u)}
                </span>
              ))}
            </div>
          </div>
        )}

        {presenceEstado === "ready" && otrosUsuariosEnLinea.length === 0 && (
          <p className="mt-2 text-[10px] text-zinc-400">Nadie más conectado ahora</p>
        )}
      </div>

      {(widgetsVisibles.robin.length > 0 || widgetsVisibles.clientes.length > 0) && (
        <div className="flex flex-col gap-2">
          <span className="mobile-section-label md:hidden">Accesos rápidos</span>
          <MobileWidgetsGrid
            widgets={todosLosWidgets}
            variant="preview"
            username={username}
            onVerMas={() => setWidgetsMobileVista("todos")}
          />
          <DesktopWidgetsPanel widgetsAgrupados={widgetsVisibles} username={username} />
        </div>
      )}

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

      <div className="area-stat-card">
        <div className="area-stat-header">
          <span>Resumen del área</span>
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
  );
}

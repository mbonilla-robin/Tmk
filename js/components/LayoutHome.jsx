function LayoutHome({ tareas, nombreUsuario, username, onSelectTask, onUpdateField, widgets, currentTheme, getMarcaStyle }) {

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
      .filter(t => cleanPrioridad(t.prioridad) === "alta" && cleanEstado(t.estado) !== "completada")
      .slice(0, 5);
  }, [tareas]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Bienvenida limpia */}
      <div className="border-b border-zinc-150 pb-2.5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#37352F] tracking-tight">
            Home
          </h2>
          <p className="text-[11px] text-zinc-400 font-medium">
            Workspace unificado de Trade & Shopper Marketing.
          </p>
        </div>
      </div>

      {/* BARRA HORIZONTAL DE ACCESOS DIRECTOS (WIDGETS) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Enlaces de interés</span>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto py-1 pr-1 no-scrollbar">
          {widgets.length === 0 ? (
            <div className="text-xs text-zinc-400 italic py-1">No hay enlaces rápidos registrados.</div>
          ) : (
            widgets.map(w => (
              <a
                key={w.id}
                href={w.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded border border-zinc-200 bg-white hover:bg-zinc-50/50 transition-colors shrink-0 shadow-sm"
              >
                <div className={`p-1 rounded shrink-0 ${w.color || "bg-zinc-100 text-zinc-700"}`}>
                  <WidgetIcon iconName={w.icon} className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-zinc-700 truncate max-w-[120px]">{w.titulo}</span>
              </a>
            ))
          )}
        </div>
      </div>

      {/* PRIORIDAD ALTA ACTIVA - BARRA HORIZONTAL PRINCIPAL */}
      <div className="border border-zinc-200 p-4 rounded-md bg-white flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Prioridad Alta Activa (Entregas Urgentes)</span>
          <span className="text-[10px] bg-red-50 text-red-750 px-2 py-0.5 rounded border border-red-100 font-semibold">Urgentes</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {highPriorityTasks.length === 0 ? (
            <div className="col-span-full py-4 text-center text-zinc-400 text-xs">
              No hay entregables urgentes pendientes en este momento.
            </div>
          ) : (
            highPriorityTasks.map(t => {
              const cMarca = getMarcaStyle(t.marca);
              return (
                <div 
                  key={t.idTarea} 
                  onClick={() => onSelectTask(t)}
                  className={`p-3 border rounded hover:brightness-[0.98] transition-all cursor-pointer flex flex-col justify-between gap-2 ${cMarca.bg} ${cMarca.text} ${cMarca.border}`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cMarca.bg} ${cMarca.text} ${cMarca.border} opacity-80`}>
                        {formatearMarca(t.marca)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold line-clamp-3 leading-relaxed">{t.info}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-current/10 text-[10px] opacity-70">
                    <span>Límite: <span className="font-bold">{t.deadline ? formatearFecha(t.deadline) : "--/--"}</span></span>
                    <i className="fa-solid fa-arrow-right text-[9px] opacity-50"></i>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Estadísticas en formato Notion Table */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-zinc-200 rounded-md p-4 bg-[#FAF9F6]/20">
        <div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-tight block">Total Entregables</span>
          <span className="text-xl font-extrabold text-[#37352F] mt-1 block">{stats.total}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-tight block">En progreso</span>
          <span className="text-xl font-extrabold text-blue-600 mt-1 block">{stats.enProgreso}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-tight block">Completados</span>
          <span className="text-xl font-extrabold text-emerald-600 mt-1 block">{stats.completadas}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-tight block">Atrasadas</span>
          <span className="text-xl font-extrabold text-red-600 mt-1 block">{stats.atrasadas}</span>
        </div>
      </div>

      {/* Calendario de entregables - ANCHO COMPLETO */}
      <div className="w-full">
        <CalendarioNotion 
          tareas={tareas} 
          onSelectTask={onSelectTask} 
          getMarcaStyle={getMarcaStyle}
        />
      </div>

    </div>
  );
}

// =========================================================================
// 🏢 COMPONENTE: LAYOUT DE CLIENTES (FICHAS TÉCNICAS ESTILO NOTION PAGE)
// =========================================================================

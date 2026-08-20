function BarraEstadosEquipo({ porEstado, onSegmentClick }) {
  const segmentos = ESTADOS_BARRA_EQUIPO
    .map((cfg) => ({ ...cfg, count: porEstado[cfg.key] || 0 }))
    .filter((s) => s.count > 0);

  const total = segmentos.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) {
    return (
      <div className="h-2 rounded-full bg-zinc-100 w-full" title="Sin tareas activas en este periodo" />
    );
  }

  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full bg-zinc-100">
      {segmentos.map((seg) => (
        <button
          key={seg.key}
          type="button"
          title={`${seg.label}: ${seg.count}`}
          onClick={() => onSegmentClick && onSegmentClick(seg.key)}
          className={`${seg.color} hover:opacity-80 transition-opacity`}
          style={{ width: `${(seg.count / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function TarjetaPersonaEquipo({ persona, enLinea, onVerTareas, onSegmentClick }) {
  const leyenda = ESTADOS_BARRA_EQUIPO
    .filter((cfg) => (persona.porEstado[cfg.key] || 0) > 0)
    .map((cfg) => `${cfg.label} (${persona.porEstado[cfg.key]})`)
    .join(" · ");

  return (
    <div className="border border-zinc-200 rounded-lg bg-white p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {enLinea ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-zinc-300 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#37352F] truncate">{persona.display}</p>
              <p className="text-[10px] text-zinc-400 font-medium">{persona.handleFiltro}</p>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            {enLinea ? "En línea" : "Sin conexión"}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className={`text-[10px] font-bold uppercase tracking-wide ${persona.nivelCarga.color}`}>
            Carga {persona.nivelCarga.label}
          </p>
          <div className="w-16 h-1.5 rounded-full bg-zinc-100 mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${persona.nivelCarga.bar}`}
              style={{ width: `${persona.nivelCarga.pct}%` }}
            />
          </div>
        </div>
      </div>

      <BarraEstadosEquipo porEstado={persona.porEstado} onSegmentClick={onSegmentClick} />

      {leyenda && (
        <p className="text-[10px] text-zinc-500 leading-relaxed">{leyenda}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-600">
        <span><strong className="text-zinc-800">{persona.activas}</strong> activas</span>
        {persona.completadasPeriodo > 0 && (
          <span><strong className="text-emerald-700">{persona.completadasPeriodo}</strong> completadas</span>
        )}
        {persona.atrasadas > 0 && (
          <span><strong className="text-red-600">{persona.atrasadas}</strong> atrasadas</span>
        )}
        {persona.vencenHoy > 0 && (
          <span><strong className="text-blue-600">{persona.vencenHoy}</strong> vencen hoy</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onVerTareas(persona.handleFiltro)}
        className="self-start text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"
      >
        Ver tareas
        <SVGIcon.ChevronRight className="w-3 h-3 opacity-60" />
      </button>
    </div>
  );
}

function SeccionRolEquipo({ titulo, personas, usuariosConectados, onVerTareasPersona, onSegmentClick }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-[#37352F] tracking-tight">{titulo}</h3>
        <span className="text-[10px] text-zinc-400 font-medium">
          {personas.length} {personas.length === 1 ? "persona" : "personas"}
        </span>
      </div>
      {personas.length === 0 ? (
        <p className="text-sm text-zinc-500 py-4 text-center border border-dashed border-zinc-200 rounded-lg">
          Nadie en este rol todavía.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {personas.map((persona) => (
            <TarjetaPersonaEquipo
              key={persona.handle}
              persona={persona}
              enLinea={estaUsuarioEnLinea(persona.handle, usuariosConectados)}
              onVerTareas={(handleFiltro) => onVerTareasPersona(handleFiltro, null)}
              onSegmentClick={(estadoKey) => onSegmentClick(persona.handleFiltro, estadoKey)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LayoutEquipos({
  tareas,
  usuariosConectados,
  listaEjecutivos,
  listaContenido,
  listaDisenadores,
  onVerTareasPersona
}) {
  const [rango, setRango] = useState("todo");

  const roster = useMemo(
    () => obtenerRosterEquipos(listaEjecutivos, listaContenido, listaDisenadores, tareas),
    [listaEjecutivos, listaContenido, listaDisenadores, tareas]
  );

  const metricas = useMemo(
    () => agregarMetricasPorPersona(tareas, rango, roster),
    [tareas, rango, roster]
  );

  const { ejecutivos, contenido, disenadores } = useMemo(() => {
    const exec = [];
    const cont = [];
    const dis = [];
    metricas.forEach((persona) => {
      if (isRobinDesigner(persona.handle, listaDisenadores)) dis.push(persona);
      else if (isRobinContent(persona.handle, listaContenido)) cont.push(persona);
      else exec.push(persona);
    });
    return { ejecutivos: exec, contenido: cont, disenadores: dis };
  }, [metricas, listaDisenadores, listaContenido]);

  const resumen = useMemo(() => {
    const activas = metricas.reduce((sum, p) => sum + p.activas, 0);
    const atrasadas = metricas.reduce((sum, p) => sum + p.atrasadas, 0);
    const enLinea = metricas.filter((p) => estaUsuarioEnLinea(p.handle, usuariosConectados)).length;
    return { activas, atrasadas, enLinea, personas: metricas.length };
  }, [metricas, usuariosConectados]);

  const handleSegmentClick = (handleFiltro, estadoKey) => {
    const estadoMap = {
      "en progreso": "En progreso",
      "espera de comentarios": "Espera de comentarios",
      seguimiento: "Espera de comentarios",
      pendiente: "Pendiente",
      "en revision": "En revision",
      "en pausa": "En pausa"
    };
    onVerTareasPersona(handleFiltro, estadoMap[estadoKey] || null);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5 animate-fade-in">
      <div className="border-b border-zinc-150 pb-2.5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#37352F] tracking-tight">Equipos</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Carga de trabajo por persona · {resumen.personas} personas
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRango("hoy")}
            className={`notion-time-pill ${rango === "hoy" ? "is-active-blue" : ""}`}
            title="Completadas con deadline hoy"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setRango("semana")}
            className={`notion-time-pill ${rango === "semana" ? "is-active" : ""}`}
            title="Completadas con deadline esta semana"
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setRango("todo")}
            className={`notion-time-pill ${rango === "todo" ? "is-active" : ""}`}
            title="Todas las completadas"
          >
            Todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="border border-zinc-200 rounded-md px-3 py-2 bg-zinc-50/50">
          <p className="text-[10px] text-zinc-400 font-semibold uppercase">Activas</p>
          <p className="text-lg font-bold text-[#37352F]">{resumen.activas}</p>
        </div>
        <div className="border border-zinc-200 rounded-md px-3 py-2 bg-zinc-50/50">
          <p className="text-[10px] text-zinc-400 font-semibold uppercase">Atrasadas</p>
          <p className={`text-lg font-bold ${resumen.atrasadas > 0 ? "text-red-600" : "text-[#37352F]"}`}>
            {resumen.atrasadas}
          </p>
        </div>
        <div className="border border-zinc-200 rounded-md px-3 py-2 bg-zinc-50/50">
          <p className="text-[10px] text-zinc-400 font-semibold uppercase">En línea</p>
          <p className="text-lg font-bold text-emerald-700">{resumen.enLinea}</p>
        </div>
        <div className="border border-zinc-200 rounded-md px-3 py-2 bg-zinc-50/50 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-zinc-400 font-semibold uppercase">Completadas</p>
          <p className="text-sm font-bold text-[#37352F] capitalize">
            {rango === "hoy" ? "Hoy" : rango === "semana" ? "Esta semana" : "Todas"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <SeccionRolEquipo
          titulo="Ejecutivos"
          personas={ejecutivos}
          usuariosConectados={usuariosConectados}
          onVerTareasPersona={onVerTareasPersona}
          onSegmentClick={handleSegmentClick}
        />
        <SeccionRolEquipo
          titulo="Contenido"
          personas={contenido}
          usuariosConectados={usuariosConectados}
          onVerTareasPersona={onVerTareasPersona}
          onSegmentClick={handleSegmentClick}
        />
        <SeccionRolEquipo
          titulo="Diseñadores"
          personas={disenadores}
          usuariosConectados={usuariosConectados}
          onVerTareasPersona={onVerTareasPersona}
          onSegmentClick={handleSegmentClick}
        />
      </div>
    </div>
  );
}

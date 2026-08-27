const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_NOMBRE = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

function formatearHoraReloj(fecha) {
  return fecha.toLocaleTimeString("es-VE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function formatearFechaReloj(fecha) {
  const dia = DIAS_SEMANA[fecha.getDay()];
  const mes = MESES_NOMBRE[fecha.getMonth()];
  return `${dia}, ${mes} ${fecha.getDate()}`;
}

function prioridadEtiquetaCorta(prioridad) {
  const p = normalizarPrioridad(prioridad);
  if (p === "Alta") return "Alta";
  if (p === "Baja") return "Baja";
  return "Media";
}

function HoyIconoPersonaSola({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="4.25" r="2.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M3.5 13.25c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HoyIconoPersonasGrupo({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M1.75 13.25c0-2.07 1.68-3.75 3.75-3.75"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="11" cy="4.75" r="1.85" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M7.5 13.25c0-1.9 1.55-3.45 3.45-3.45"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HoyFiltroAlcanceToggle({ valor, onChange }) {
  const esMio = valor === "mio";
  const siguiente = esMio ? "equipo" : "mio";

  return (
    <button
      type="button"
      onClick={() => onChange(siguiente)}
      title={esMio ? "Ver equipo" : "Ver mis tareas"}
      aria-label={esMio ? "Ver tareas del equipo" : "Ver mis tareas"}
      className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-md bg-zinc-100/90 text-zinc-500 hover:text-[#37352F] hover:bg-zinc-100 transition-colors"
    >
      {esMio ? (
        <HoyIconoPersonasGrupo className="w-3 h-3" />
      ) : (
        <HoyIconoPersonaSola className="w-3 h-3" />
      )}
    </button>
  );
}

function HoyTagPill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded-full border ${className}`}>
      {children}
    </span>
  );
}

function TarjetaTareaHoy({ tarea, esUltimo, onSelectTask, getMarcaStyle, pieFecha }) {
  const cMarca = getMarcaStyle ? getMarcaStyle(tarea.marca) : { surface: "marca-surface-otros", accent: "#71717a" };
  const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(tarea.estado)) || ESTADOS_MAPA[0];
  const cPrioridad = PRIORIDADES_MAPA.find((p) => cleanPrioridad(p.id) === cleanPrioridad(tarea.prioridad)) || PRIORIDADES_MAPA[1];
  const fechaInicio = resolverFechaInicioTarea(tarea);
  const subcliente = typeof obtenerSubclienteTarea === "function"
    ? obtenerSubclienteTarea(tarea)
    : String(tarea.subcliente || "").trim();

  return (
    <div className="flex gap-2 min-w-0">
      <div className="relative flex flex-col items-center w-2.5 shrink-0 pt-3">
        <span
          className="w-2 h-2 rounded-full bg-zinc-300 ring-[3px] ring-white shrink-0 relative z-10"
          aria-hidden="true"
        />
        {!esUltimo && (
          <span
            className="absolute top-[1.125rem] left-1/2 -translate-x-1/2 w-px bg-zinc-200 bottom-[-0.625rem]"
            aria-hidden="true"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelectTask(tarea)}
        title={tarea.info}
        className="flex-1 min-w-0 mb-0 text-left rounded-xl border border-zinc-200 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:border-zinc-300 active:scale-[0.995]"
      >
        <p className="text-[10px] font-semibold leading-snug line-clamp-2 text-[#37352F]">
          {tarea.info || "Sin título"}
        </p>

        <div className="flex flex-wrap gap-1 mt-1.5">
          <HoyTagPill className={cMarca.surface}>
            {formatearMarca(tarea.marca)}
          </HoyTagPill>
          {subcliente ? (
            <HoyTagPill className="bg-zinc-100 text-zinc-700 border-zinc-200">
              <i className="fa-solid fa-store text-[8px] text-zinc-400" aria-hidden="true" />
              {subcliente}
            </HoyTagPill>
          ) : null}
          <HoyTagPill className={cEstado.bg}>
            <span className={`w-1 h-1 rounded-full shrink-0 ${cEstado.dot}`} aria-hidden="true" />
            {normalizarEstado(tarea.estado)}
          </HoyTagPill>
          <HoyTagPill className={cPrioridad.color}>
            {prioridadEtiquetaCorta(tarea.prioridad)}
          </HoyTagPill>
        </div>

        <p className="text-[9px] text-zinc-400 mt-1.5 tabular-nums leading-snug">
          {fechaInicio && (
            <span className="block">Inicio {formatearFecha(fechaInicio)}</span>
          )}
          <span className="block">{pieFecha}</span>
        </p>
      </button>
    </div>
  );
}

function SeccionTareasHoy({ titulo, subtitulo, conteo, vacio, tareas, onSelectTask, getMarcaStyle, pieFechaFn }) {
  return (
    <section className="shrink-0">
      <div className="px-3 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold text-[#37352F] leading-none block">{titulo}</span>
          {subtitulo && (
            <span className="text-[9px] text-zinc-400 mt-0.5 block leading-snug">{subtitulo}</span>
          )}
        </div>
        <span className="text-[9px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-full min-w-[1.125rem] h-4 px-1.5 inline-flex items-center justify-center tabular-nums shrink-0">
          {conteo}
        </span>
      </div>

      {tareas.length === 0 ? (
        <p className="text-[10px] text-zinc-400 text-center px-3 py-4 leading-relaxed">{vacio}</p>
      ) : (
        <div className="flex flex-col gap-2.5 px-2 pb-1">
          {tareas.map((t, index) => (
            <TarjetaTareaHoy
              key={t.idTarea}
              tarea={t}
              esUltimo={index === tareas.length - 1}
              onSelectTask={onSelectTask}
              getMarcaStyle={getMarcaStyle}
              pieFecha={pieFechaFn(t)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BarraHoyAccesoRapido({ tareas, username, onSelectTask, getMarcaStyle, soloMisTareas = false }) {
  const [ahora, setAhora] = useState(() => new Date());
  const [filtroAlcance, setFiltroAlcance] = useState(soloMisTareas ? "mio" : "mio");

  useEffect(() => {
    const tick = () => setAhora(new Date());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const { entregasHoy, trabajarHoy } = useMemo(() => {
    const tHoy = obtenerTiempoHoyLocal();
    const listaBase = tareas || [];
    const lista =
      (soloMisTareas || filtroAlcance === "mio") && username
        ? listaBase.filter((t) => tareaIncluyePersonaFiltro(t.personas || "", username))
        : listaBase;

    const entregas = ordenarTareasParaHoy(lista.filter((t) => esEntregaHoyTarea(t, tHoy)));
    const trabajar = ordenarTareasParaHoy(lista.filter((t) => esTrabajarHoyTarea(t, tHoy)));

    return { entregasHoy: entregas, trabajarHoy: trabajar };
  }, [tareas, username, filtroAlcance, soloMisTareas]);

  const subtituloAlcance = soloMisTareas || filtroAlcance === "mio" ? "Mis tareas" : "Trabajo en equipo";

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 w-56 min-w-[14rem] h-full bg-white border-l border-zinc-200 overflow-hidden"
      aria-label="Panel de hoy"
      data-induccion="panel-hoy"
    >
      <div className="px-3 pt-3 pb-2 shrink-0 border-b border-zinc-100">
        <div className="relative rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {!soloMisTareas && (
            <HoyFiltroAlcanceToggle valor={filtroAlcance} onChange={setFiltroAlcance} />
          )}
          <time
            className="block text-base font-bold text-[#37352F] tracking-tight leading-none"
            dateTime={ahora.toISOString()}
          >
            {formatearHoraReloj(ahora)}
          </time>
          <p className="text-[10px] font-medium text-zinc-500 mt-1 leading-snug">
            {formatearFechaReloj(ahora)}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-3 no-scrollbar">
        <SeccionTareasHoy
          titulo="Entregas hoy"
          subtitulo={subtituloAlcance}
          conteo={entregasHoy.length}
          vacio="Sin entregas para hoy"
          tareas={entregasHoy}
          onSelectTask={onSelectTask}
          getMarcaStyle={getMarcaStyle}
          pieFechaFn={(t) => (t.deadline ? `Entrega ${formatearFecha(t.deadline)}` : "Entrega —")}
        />

        <div className="mx-3 my-3 border-t border-zinc-100" aria-hidden="true" />

        <SeccionTareasHoy
          titulo="¿Qué trabajar hoy?"
          subtitulo={subtituloAlcance}
          conteo={trabajarHoy.length}
          vacio="Nada pendiente de avanzar hoy"
          tareas={trabajarHoy}
          onSelectTask={onSelectTask}
          getMarcaStyle={getMarcaStyle}
          pieFechaFn={(t) => (t.deadline ? `Entrega ${formatearFecha(t.deadline)}` : "Entrega —")}
        />
      </div>
    </aside>
  );
}

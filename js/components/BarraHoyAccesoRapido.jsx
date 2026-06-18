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

function HoyTagPill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded-full border ${className}`}>
      {children}
    </span>
  );
}

function TarjetaTareaHoy({ tarea, esUltimo, onSelectTask, getMarcaStyle, pieFecha }) {
  const cMarca = getMarcaStyle ? getMarcaStyle(tarea.marca) : { bg: "bg-zinc-50", text: "text-zinc-600", border: "border-zinc-200" };
  const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(tarea.estado)) || ESTADOS_MAPA[0];
  const cPrioridad = PRIORIDADES_MAPA.find((p) => cleanPrioridad(p.id) === cleanPrioridad(tarea.prioridad)) || PRIORIDADES_MAPA[1];
  const fechaInicio = resolverFechaInicioTarea(tarea);

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
          <HoyTagPill className={`${cMarca.bg} ${cMarca.text} ${cMarca.border}`}>
            {formatearMarca(tarea.marca)}
          </HoyTagPill>
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

function SeccionTareasHoy({ titulo, conteo, vacio, tareas, onSelectTask, getMarcaStyle, pieFechaFn }) {
  return (
    <section className="shrink-0">
      <div className="px-3 pb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-[#37352F] leading-none">{titulo}</span>
        <span className="text-[9px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-full min-w-[1.125rem] h-4 px-1.5 inline-flex items-center justify-center tabular-nums">
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

function BarraHoyAccesoRapido({ tareas, onSelectTask, getMarcaStyle }) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setAhora(new Date());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const { entregasHoy, trabajarHoy } = useMemo(() => {
    const tHoy = obtenerTiempoHoyLocal();
    const lista = tareas || [];

    const entregas = ordenarTareasParaHoy(lista.filter((t) => esEntregaHoyTarea(t, tHoy)));
    const trabajar = ordenarTareasParaHoy(lista.filter((t) => esTrabajarHoyTarea(t, tHoy)));

    return { entregasHoy: entregas, trabajarHoy: trabajar };
  }, [tareas]);

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 w-56 min-w-[14rem] h-full bg-white border-l border-zinc-200 overflow-hidden"
      aria-label="Panel de hoy"
    >
      <div className="px-3 pt-3 pb-2 shrink-0 border-b border-zinc-100">
        <div className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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

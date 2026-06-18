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
  if (p === "Alta") return "ALTA";
  if (p === "Baja") return "BAJA";
  return "MEDIA";
}

function prioridadClaseTexto(prioridad) {
  const p = normalizarPrioridad(prioridad);
  if (p === "Alta") return "text-red-600";
  if (p === "Baja") return "text-zinc-400";
  return "text-zinc-500";
}

function TarjetaTareaHoy({ tarea, esUltimo, onSelectTask, getMarcaStyle, pieFecha }) {
  const cMarca = getMarcaStyle ? getMarcaStyle(tarea.marca) : { bg: "bg-zinc-50", text: "text-zinc-600", border: "border-zinc-200" };
  const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(tarea.estado)) || ESTADOS_MAPA[0];

  return (
    <div className="flex gap-1.5 min-w-0">
      <div className="flex flex-col items-center w-2 shrink-0 pt-2.5">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${cEstado.dot} ring-[2px] ring-white`}
          aria-hidden="true"
        />
        {!esUltimo && <span className="w-px flex-1 min-h-[0.5rem] bg-zinc-200 mt-0.5" aria-hidden="true" />}
      </div>

      <button
        type="button"
        onClick={() => onSelectTask(tarea)}
        title={tarea.info}
        className={`flex-1 min-w-0 mb-1.5 text-left rounded-md border p-2 transition-all cursor-pointer active:scale-[0.99] hover:shadow-sm ${cMarca.bg} ${cMarca.text} ${cMarca.border}`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={`text-[8px] font-bold px-1 py-px rounded border truncate max-w-[58%] ${cMarca.bg} ${cMarca.text} ${cMarca.border}`}>
            {formatearMarca(tarea.marca)}
          </span>
          <span className={`text-[7px] font-bold uppercase tracking-wide shrink-0 ${prioridadClaseTexto(tarea.prioridad)}`}>
            {prioridadEtiquetaCorta(tarea.prioridad)}
          </span>
        </div>

        <p className="text-[10px] font-semibold leading-snug line-clamp-2 text-[#37352F]">
          {tarea.info || "Sin título"}
        </p>

        <div className="flex flex-col gap-0.5 mt-1.5 pt-1.5 border-t border-black/[0.06] text-[9px] text-zinc-600">
          <span className="inline-flex items-center gap-1 min-w-0">
            <span className={`w-1 h-1 rounded-full shrink-0 ${cEstado.dot}`} />
            <span className="truncate">{normalizarEstado(tarea.estado)}</span>
          </span>
          <span className="inline-flex items-center gap-1 min-w-0 text-zinc-500">
            <SVGIcon.Calendar className="w-2 h-2 opacity-60 shrink-0" />
            <span className="truncate tabular-nums">{pieFecha}</span>
          </span>
        </div>
      </button>
    </div>
  );
}

function SeccionTareasHoy({ titulo, conteo, vacio, tareas, onSelectTask, getMarcaStyle, pieFechaFn }) {
  return (
    <section className="shrink-0">
      <div className="px-2.5 pb-1.5 flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 leading-snug">{titulo}</span>
        <span className="text-[9px] font-bold text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full min-w-[1.1rem] h-4 px-1.5 inline-flex items-center justify-center tabular-nums">
          {conteo}
        </span>
      </div>

      {tareas.length === 0 ? (
        <p className="text-[10px] text-zinc-400 text-center px-1 py-3 leading-relaxed">{vacio}</p>
      ) : (
        <div className="flex flex-col px-2">
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
      className="hidden md:flex flex-col shrink-0 w-52 min-w-[13rem] h-full bg-white border-l border-zinc-200 overflow-hidden"
      aria-label="Panel de hoy"
    >
      <div className="px-2.5 pt-3 pb-2 shrink-0">
        <div className="border border-zinc-200 rounded-lg px-2.5 py-2 text-center">
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

      <div className="flex-1 min-h-0 overflow-y-auto pb-3 [scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent]">
        <SeccionTareasHoy
          titulo="Entregas hoy"
          conteo={entregasHoy.length}
          vacio="Sin entregas para hoy"
          tareas={entregasHoy}
          onSelectTask={onSelectTask}
          getMarcaStyle={getMarcaStyle}
          pieFechaFn={(t) => (t.deadline ? formatearFecha(t.deadline) : "—")}
        />

        <div className="mx-2.5 my-2 border-t border-zinc-100" aria-hidden="true" />

        <SeccionTareasHoy
          titulo="¿Qué trabajar hoy?"
          conteo={trabajarHoy.length}
          vacio="Nada pendiente de avanzar hoy"
          tareas={trabajarHoy}
          onSelectTask={onSelectTask}
          getMarcaStyle={getMarcaStyle}
          pieFechaFn={(t) => `Entrega ${t.deadline ? formatearFecha(t.deadline) : "—"}`}
        />
      </div>
    </aside>
  );
}

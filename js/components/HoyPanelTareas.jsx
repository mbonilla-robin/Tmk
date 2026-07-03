const DIAS_SEMANA_HOY = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_NOMBRE_HOY = [
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
  const dia = DIAS_SEMANA_HOY[fecha.getDay()];
  const mes = MESES_NOMBRE_HOY[fecha.getMonth()];
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
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.75 13.25c0-2.07 1.68-3.75 3.75-3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="11" cy="4.75" r="1.85" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 13.25c0-1.9 1.55-3.45 3.45-3.45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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
      className="hoy-panel__filter-btn"
    >
      {esMio ? (
        <HoyIconoPersonasGrupo className="w-3 h-3" />
      ) : (
        <HoyIconoPersonaSola className="w-3 h-3" />
      )}
    </button>
  );
}

function HoyRelojCompacto({ ahora, soloMisTareas, filtroAlcance, onCambiarAlcance }) {
  return (
    <div className="hoy-panel__clock">
      {!soloMisTareas && onCambiarAlcance && (
        <HoyFiltroAlcanceToggle valor={filtroAlcance} onChange={onCambiarAlcance} />
      )}
      <time className="hoy-panel__clock-time" dateTime={ahora.toISOString()}>
        {formatearHoraReloj(ahora)}
      </time>
      <p className="hoy-panel__clock-date">{formatearFechaReloj(ahora)}</p>
    </div>
  );
}

function HoyTagPill({ children, className = "" }) {
  return (
    <span className={`hoy-panel__tag ${className}`.trim()}>
      {children}
    </span>
  );
}

function TarjetaTareaHoy({ tarea, esUltimo, onSelectTask, getMarcaStyle, pieFecha }) {
  const cMarca = getMarcaStyle ? getMarcaStyle(tarea.marca) : { surface: "marca-surface-otros", accent: "#71717a" };
  const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(tarea.estado)) || ESTADOS_MAPA[0];
  const cPrioridad = PRIORIDADES_MAPA.find((p) => cleanPrioridad(p.id) === cleanPrioridad(tarea.prioridad)) || PRIORIDADES_MAPA[1];
  const fechaInicio = resolverFechaInicioTarea(tarea);

  return (
    <div className="hoy-panel__task-row">
      <div className="hoy-panel__task-rail" aria-hidden="true">
        <span className="hoy-panel__task-node" />
        {!esUltimo && <span className="hoy-panel__task-line" />}
      </div>

      <button
        type="button"
        onClick={() => onSelectTask(tarea)}
        title={tarea.info}
        className="hoy-panel__task-card"
      >
        <p className="hoy-panel__task-title">{tarea.info || "Sin título"}</p>

        <div className="hoy-panel__task-tags">
          <HoyTagPill className={cMarca.surface}>
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

        <p className="hoy-panel__task-dates">
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
    <section className="hoy-panel__section">
      <div className="hoy-panel__section-head">
        <div className="min-w-0">
          <span className="hoy-panel__section-title">{titulo}</span>
          {subtitulo && (
            <span className="hoy-panel__section-sub">{subtitulo}</span>
          )}
        </div>
        <span className="hoy-panel__section-count">{conteo}</span>
      </div>

      {tareas.length === 0 ? (
        <p className="hoy-panel__section-empty">{vacio}</p>
      ) : (
        <div className="hoy-panel__section-list">
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

function useTareasHoyPanel({ tareas, username, soloMisTareas, filtroAlcance }) {
  return useMemo(() => {
    const tHoy = obtenerTiempoHoyLocal();
    const listaBase = tareas || [];
    const lista =
      (soloMisTareas || filtroAlcance === "mio") && username
        ? listaBase.filter((t) => tareaIncluyePersonaFiltro(t.personas || "", username))
        : listaBase;

    return {
      entregasHoy: ordenarTareasParaHoy(lista.filter((t) => esEntregaHoyTarea(t, tHoy))),
      trabajarHoy: ordenarTareasParaHoy(lista.filter((t) => esTrabajarHoyTarea(t, tHoy)))
    };
  }, [tareas, username, filtroAlcance, soloMisTareas]);
}

function useRelojHoy(intervaloMs = 30000) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setAhora(new Date());
    tick();
    const id = setInterval(tick, intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);

  return ahora;
}

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

function BarraHoyAccesoRapido({ tareas, onSelectTask }) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setAhora(new Date());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const tareasHoy = useMemo(() => {
    const hoy = new Date();
    const tHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

    return (tareas || [])
      .filter((t) => {
        const tDeadline = obtenerTiempoFecha(t.deadline);
        return tDeadline !== Infinity && tDeadline === tHoy && cleanEstado(t.estado) !== "completada";
      })
      .sort((a, b) => {
        const pesoA = getPriorityWeight(a.prioridad);
        const pesoB = getPriorityWeight(b.prioridad);
        if (pesoA !== pesoB) return pesoB - pesoA;
        return (a.info || "").localeCompare(b.info || "", "es");
      });
  }, [tareas]);

  return (
    <aside className="hoy-barra-quick robin-desktop-only" aria-label="Entregables de hoy">
      <div className="hoy-barra-inner">
        <div className="hoy-barra-clock-card">
          <time className="hoy-barra-clock-time" dateTime={ahora.toISOString()}>
            {formatearHoraReloj(ahora)}
          </time>
          <span className="hoy-barra-clock-date">{formatearFechaReloj(ahora)}</span>
        </div>

        <div className="hoy-barra-section-head">
          <span className="hoy-barra-section-title">Hoy</span>
          <span className="hoy-barra-section-count">{tareasHoy.length}</span>
        </div>

        <div className="hoy-barra-timeline">
          {tareasHoy.length === 0 ? (
            <p className="hoy-barra-empty">Sin entregables para hoy</p>
          ) : (
            tareasHoy.map((t) => {
              const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(t.estado)) || ESTADOS_MAPA[0];
              const cPrioridad = PRIORIDADES_MAPA.find((p) => cleanPrioridad(p.id) === cleanPrioridad(t.prioridad)) || PRIORIDADES_MAPA[1];
              const prioridadLabel = normalizarPrioridad(t.prioridad);

              return (
                <div key={t.idTarea} className="hoy-timeline-item">
                  <div className="hoy-timeline-rail" aria-hidden="true">
                    <span className={`hoy-timeline-dot ${cEstado.dot}`} />
                  </div>
                  <button
                    type="button"
                    className="hoy-timeline-card"
                    onClick={() => onSelectTask(t)}
                    title={t.info}
                  >
                    <p className="hoy-timeline-title">{t.info || "Sin título"}</p>
                    <div className="hoy-timeline-meta">
                      <span className={`hoy-timeline-chip ${cEstado.bg}`}>
                        <span className={`hoy-timeline-chip-dot ${cEstado.dot}`} />
                        {normalizarEstado(t.estado)}
                      </span>
                      <span className={`hoy-timeline-chip ${cPrioridad.color}`}>
                        {prioridadLabel}
                      </span>
                      <span className="hoy-timeline-date">
                        {t.deadline ? formatearFecha(t.deadline) : "—"}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}

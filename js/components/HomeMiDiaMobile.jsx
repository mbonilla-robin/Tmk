function HomeTaskTile({ tarea, onSelect, getMarcaStyle, footMeta }) {
  const cMarca = getMarcaStyle ? getMarcaStyle(tarea.marca) : { accent: "#71717a" };
  const cEstado = ESTADOS_MAPA.find((e) => cleanEstado(e.id) === cleanEstado(tarea.estado)) || ESTADOS_MAPA[0];

  return (
    <button
      type="button"
      onClick={() => onSelect(tarea)}
      className="home-task-tile"
      style={{ "--tile-accent": cMarca.accent || "#71717a" }}
    >
      <span className="home-task-tile__marca">{formatearMarca(tarea.marca)}</span>
      <span className="home-task-tile__title">{tarea.info || "Sin título"}</span>
      <span className="home-task-tile__foot">
        <span className={`home-task-tile__dot ${cEstado.dot}`} aria-hidden="true" />
        <span className="home-task-tile__meta">{footMeta}</span>
      </span>
    </button>
  );
}

function HomeMiDiaMobile({ tareas, username, onSelectTask, getMarcaStyle, soloMisTareas = false, onVerTodasHoy }) {
  const [filtroAlcance, setFiltroAlcance] = useState(soloMisTareas ? "mio" : "mio");

  const { entregasHoy, trabajarHoy } = useMemo(() => {
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

  const tareasMiDia = useMemo(() => {
    const ids = new Set();
    const merged = [];
    [...entregasHoy, ...trabajarHoy].forEach((t) => {
      const key = getTaskSelectionKey(t);
      if (!ids.has(key)) {
        ids.add(key);
        merged.push({ tarea: t, esEntrega: esEntregaHoyTarea(t, obtenerTiempoHoyLocal()) });
      }
    });
    return merged;
  }, [entregasHoy, trabajarHoy]);

  if (tareasMiDia.length === 0) return null;

  return (
    <section className="home-section md:hidden" data-induccion="mi-dia-mobile">
      <div className="home-section__head">
        <div className="home-section__head-left">
          <span className="home-section__title">Mi día</span>
          <span className="home-section__subtitle">
            {tareasMiDia.length} tarea{tareasMiDia.length !== 1 ? "s" : ""}
            {" · "}
            {soloMisTareas || filtroAlcance === "mio" ? "Mis tareas" : "Equipo"}
          </span>
        </div>
        <div className="home-section__actions">
          {!soloMisTareas && (
            <button
              type="button"
              onClick={() => setFiltroAlcance((v) => (v === "mio" ? "equipo" : "mio"))}
              className="home-section__toggle"
              title={filtroAlcance === "mio" ? "Ver equipo" : "Ver mis tareas"}
              aria-label={filtroAlcance === "mio" ? "Ver equipo" : "Ver mis tareas"}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                {filtroAlcance === "mio" ? (
                  <>
                    <circle cx="8" cy="4.25" r="2.25" stroke="currentColor" strokeWidth="1.25" />
                    <path d="M3.5 13.25c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M1.75 13.25c0-2.07 1.68-3.75 3.75-3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="11" cy="4.75" r="1.85" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M7.5 13.25c0-1.9 1.55-3.45 3.45-3.45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          )}
          {onVerTodasHoy && (
            <button type="button" onClick={onVerTodasHoy} className="home-section__link">
              Ver todas
              <SVGIcon.ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="home-tiles-scroll">
        {tareasMiDia.map(({ tarea: t, esEntrega }) => {
          const metaParts = [normalizarEstado(t.estado)];
          if (t.deadline) metaParts.push(formatearFecha(t.deadline));
          if (esEntrega) metaParts.unshift("Entrega");

          return (
            <HomeTaskTile
              key={t.idTarea}
              tarea={t}
              onSelect={onSelectTask}
              getMarcaStyle={getMarcaStyle}
              footMeta={metaParts.join(" · ")}
            />
          );
        })}
      </div>
    </section>
  );
}

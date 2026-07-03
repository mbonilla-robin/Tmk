function HomeMiDiaMobile({ tareas, username, onSelectTask, getMarcaStyle, soloMisTareas = false, onVerTodasHoy }) {
  const [filtroAlcance, setFiltroAlcance] = useState(soloMisTareas ? "mio" : "mio");
  const ahora = useRelojHoy();
  const { entregasHoy, trabajarHoy } = useTareasHoyPanel({
    tareas,
    username,
    soloMisTareas,
    filtroAlcance
  });

  const subtituloAlcance = soloMisTareas || filtroAlcance === "mio" ? "Mis tareas" : "Trabajo en equipo";

  return (
    <section className="home-hoy-mobile md:hidden" data-induccion="mi-dia-mobile" aria-label="Panel de hoy">
      <div className="home-hoy-mobile__top">
        <HoyRelojCompacto
          ahora={ahora}
          soloMisTareas={soloMisTareas}
          filtroAlcance={filtroAlcance}
          onCambiarAlcance={setFiltroAlcance}
        />
      </div>

      <div className="home-hoy-mobile__body">
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

        <div className="home-hoy-mobile__divider" aria-hidden="true" />

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

      {onVerTodasHoy && (
        <div className="home-hoy-mobile__footer">
          <button type="button" onClick={onVerTodasHoy} className="home-section__link">
            Ver todas
            <SVGIcon.ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </section>
  );
}

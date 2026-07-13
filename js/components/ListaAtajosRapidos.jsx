function calcularContadoresAtajos(tareas, username, soloMisTareas = false) {
  const tHoy = obtenerTiempoHoyLocal();
  const base = tareas || [];
  const mias = username
    ? base.filter((t) => tareaIncluyePersonaFiltro(t.personas || "", username)).length
    : 0;
  const enRevision = base.filter(
    (t) => cleanEstado(t.estado) === "en revision" && !esTareaCompletada(t)
  ).length;
  const sinDisenador = base.filter(
    (t) => tareaSinDisenadorAsignado(t) && !esTareaCompletada(t)
  ).length;
  const activasHoy = base.filter((t) => esRelevanteHoyTarea(t, tHoy)).length;
  const atrasadas = base.filter((t) => cuentaComoAtrasada(t, tHoy)).length;

  return { mias, enRevision, sinDisenador, activasHoy, atrasadas };
}

function ListaAtajosRapidos({ tareas, username, onAtajo, soloMisTareas = false, filtroActivo = null }) {
  const contadores = useMemo(
    () => calcularContadoresAtajos(tareas, username, soloMisTareas),
    [tareas, username, soloMisTareas]
  );

  const atajos = [
    { id: "hoy", label: "Hoy", count: contadores.activasHoy, className: "home-atajo--hoy", filtroKey: "tiempo:HOY" },
    { id: "atrasadas", label: "Atrasadas", count: contadores.atrasadas, className: "home-atajo--late", filtroKey: "tiempo:ATRASADAS" },
    { id: "revision", label: "En revisión", count: contadores.enRevision, className: "home-atajo--review", filtroKey: "estado:En revision" }
  ];

  if (!soloMisTareas) {
    atajos.push({
      id: "sin-disenador",
      label: "Sin diseñador",
      count: contadores.sinDisenador,
      className: "home-atajo--warn",
      filtroKey: "persona:SIN_DISENADOR"
    });
  } else {
    atajos.unshift({
      id: "mias",
      label: "Mis tareas",
      count: contadores.mias,
      className: "home-atajo--mine",
      filtroKey: "persona:mias"
    });
  }

  return (
    <div className="lista-atajos-scroll" data-induccion="dashboard-tiempo-mobile">
      {atajos.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onAtajo(a.id)}
          className={`home-atajo-pill ${a.className} ${filtroActivo === a.id ? "is-active" : ""}`}
        >
          <span>{a.label}</span>
          {a.count > 0 && <span className="home-atajo-pill__count">{a.count}</span>}
        </button>
      ))}
    </div>
  );
}

function etiquetaPrioridadFiltro(valor) {
  if (typeof PRIORIDADES_MAPA !== "undefined" && Array.isArray(PRIORIDADES_MAPA)) {
    const hit = PRIORIDADES_MAPA.find((p) => (
      typeof normalizarPrioridad === "function"
        ? normalizarPrioridad(p.id) === normalizarPrioridad(valor)
        : p.id === valor
    ));
    if (hit) return hit.label;
  }
  return String(valor || "");
}

function etiquetaPersonaFiltro(valor) {
  if (valor === "SIN_DISENADOR") return "Sin diseñador";
  if (typeof etiquetaDisplayListaPersona === "function") {
    return etiquetaDisplayListaPersona(valor) || String(valor || "");
  }
  return String(valor || "");
}

function etiquetaEstadoFiltro(valor) {
  if (typeof normalizarEstado === "function") return normalizarEstado(valor) || String(valor || "");
  return String(valor || "");
}

function etiquetaTiempoFiltro(valor) {
  if (valor === "HOY") return "Hoy";
  if (valor === "ATRASADAS") return "Atrasados";
  if (valor === "FUTURAS") return "Futuras";
  return String(valor || "");
}

/** Construye chips para la barra flotante de filtros activos. */
function construirChipsFiltrosActivos({
  filtroTiempo = "TODAS",
  filtroEstado = "TODOS",
  filtroPrioridad = "TODAS",
  filtroPersona = "TODAS",
  searchQuery = "",
  filtroSubcliente = "TODOS",
  incluirSubcliente = false
} = {}) {
  const chips = [];
  if (filtroTiempo && filtroTiempo !== "TODAS") {
    chips.push({
      id: "tiempo",
      label: etiquetaTiempoFiltro(filtroTiempo),
      icon: "Calendar"
    });
  }
  if (filtroEstado && filtroEstado !== "TODOS") {
    chips.push({
      id: "estado",
      label: etiquetaEstadoFiltro(filtroEstado),
      icon: "Status"
    });
  }
  if (filtroPrioridad && filtroPrioridad !== "TODAS") {
    chips.push({
      id: "prioridad",
      label: etiquetaPrioridadFiltro(filtroPrioridad),
      icon: "Flag"
    });
  }
  if (filtroPersona && filtroPersona !== "TODAS") {
    chips.push({
      id: "persona",
      label: etiquetaPersonaFiltro(filtroPersona),
      icon: "User"
    });
  }
  const q = String(searchQuery || "").trim();
  if (q) {
    chips.push({
      id: "search",
      label: q.length > 28 ? `${q.slice(0, 26)}…` : q,
      icon: "Search"
    });
  }
  if (incluirSubcliente && filtroSubcliente && filtroSubcliente !== "TODOS") {
    chips.push({
      id: "subcliente",
      label: String(filtroSubcliente),
      icon: "Store"
    });
  }
  return chips;
}

function FiltrosActivosBar({ chips = [], onQuitar }) {
  if (!chips || chips.length === 0) return null;

  const barra = (
    <div className="robin-filtros-activos" role="status" aria-label="Filtros activos">
      <div className="robin-filtros-activos__row">
        {chips.map((chip) => {
          const Icon = typeof SVGIcon !== "undefined" && chip.icon ? SVGIcon[chip.icon] : null;
          return (
            <div key={chip.id} className="robin-filtros-activos__chip">
              <span className="robin-filtros-activos__icon" aria-hidden="true">
                {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
              </span>
              <span className="robin-filtros-activos__label">{chip.label}</span>
              <button
                type="button"
                className="robin-filtros-activos__clear"
                aria-label={`Quitar filtro ${chip.label}`}
                title="Quitar filtro"
                onClick={() => onQuitar && onQuitar(chip.id)}
              >
                {typeof SVGIcon !== "undefined" && SVGIcon.X
                  ? <SVGIcon.X className="w-3.5 h-3.5" />
                  : <span aria-hidden="true">×</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (typeof ModalPortal === "function") return <ModalPortal>{barra}</ModalPortal>;
  if (typeof ReactDOM !== "undefined" && ReactDOM.createPortal) {
    return ReactDOM.createPortal(barra, document.body);
  }
  return barra;
}

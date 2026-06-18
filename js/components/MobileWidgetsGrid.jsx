function MobileWidgetTile({ widget, username, onUsar }) {
  const estilo = getWidgetEstilo(widget.color);
  const etiqueta = formatearTituloWidget(widget.titulo);

  const handleClick = () => {
    registrarUsoWidget(username, widget.id);
    if (onUsar) onUsar();
  };

  return (
    <a
      href={widget.link}
      target="_blank"
      rel="noopener noreferrer"
      title={widget.titulo}
      onClick={handleClick}
      className={`mobile-widget-tile ${estilo.button}`}
    >
      <span className="mobile-widget-tile-icon">
        <WidgetIcon iconName={widget.icon} className="w-4 h-4" />
      </span>
      <span className="mobile-widget-tile-label">{etiqueta}</span>
    </a>
  );
}

function MobileWidgetsGrid({
  widgets,
  widgetsAgrupados,
  variant = "preview",
  username,
  onVerMas,
  onEstatus,
  onEquipos
}) {
  const [recentTick, setRecentTick] = useState(0);

  const handleUsar = () => {
    setRecentTick(t => t + 1);
  };

  const todosLosWidgets = useMemo(() => {
    if (widgetsAgrupados) return listarTodosWidgetsAplanados(widgetsAgrupados);
    return widgets || [];
  }, [widgets, widgetsAgrupados]);

  const widgetsDestacados = useMemo(() => {
    return seleccionarWidgetsDestacados(todosLosWidgets, username, 5);
  }, [todosLosWidgets, username, recentTick]);

  const renderGrupo = (titulo, lista) => {
    if (!lista || lista.length === 0) return null;
    return (
      <div key={titulo} className="flex flex-col gap-2">
        <span className="mobile-section-label">{titulo}</span>
        <div className="mobile-widget-grid">
          {lista.map(w => (
            <MobileWidgetTile key={w.id} widget={w} username={username} onUsar={handleUsar} />
          ))}
        </div>
      </div>
    );
  };

  if (variant === "full") {
    const agrupados = widgetsAgrupados || agruparWidgetsPorSeccion(todosLosWidgets);
    const estiloEstatus = getWidgetEstilo("lavender");
    return (
      <div className="flex flex-col gap-4 md:hidden">
        {renderGrupo("Robin", agrupados.robin)}
        {renderGrupo("Clientes", agrupados.clientes)}
        {onEstatus && (
          <div className="flex flex-col gap-2">
            <span className="mobile-section-label">Más opciones</span>
            <div className="mobile-widget-grid">
              <button
                type="button"
                onClick={onEstatus}
                className={`mobile-widget-tile ${estiloEstatus.button}`}
              >
                <span className="mobile-widget-tile-icon">
                  <SVGIcon.FileText className="w-4 h-4" />
                </span>
                <span className="mobile-widget-tile-label">Estatus</span>
              </button>
              {onEquipos && (
                <button
                  type="button"
                  onClick={onEquipos}
                  className={`mobile-widget-tile ${estiloEstatus.button}`}
                >
                  <span className="mobile-widget-tile-icon">
                    <SVGIcon.Users className="w-4 h-4" />
                  </span>
                  <span className="mobile-widget-tile-label">Equipos</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!todosLosWidgets.length) return null;

  const mostrarVerMas = variant === "preview" && todosLosWidgets.length > 5;

  return (
    <div className="mobile-widget-grid md:hidden">
      {widgetsDestacados.map(w => (
        <MobileWidgetTile key={w.id} widget={w} username={username} onUsar={handleUsar} />
      ))}
      {mostrarVerMas && (
        <button
          type="button"
          onClick={onVerMas}
          className="mobile-widget-tile mobile-widget-tile-ver-mas"
        >
          <span className="mobile-widget-tile-icon">
            <i className="fa-solid fa-ellipsis text-sm" />
          </span>
          <span className="mobile-widget-tile-label">Ver más</span>
        </button>
      )}
    </div>
  );
}

function MobileWidgetsGrid({ widgets }) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <div className="mobile-widget-grid md:hidden">
      {widgets.map(w => {
        const estilo = getWidgetEstilo(w.color);
        const etiqueta = formatearTituloWidget(w.titulo);
        return (
          <a
            key={w.id}
            href={w.link}
            target="_blank"
            rel="noopener noreferrer"
            title={w.titulo}
            className={`mobile-widget-tile ${estilo.button}`}
          >
            <span className="mobile-widget-tile-icon">
              <WidgetIcon iconName={w.icon} className="w-4 h-4" />
            </span>
            <span className="mobile-widget-tile-label">{etiqueta}</span>
          </a>
        );
      })}
    </div>
  );
}

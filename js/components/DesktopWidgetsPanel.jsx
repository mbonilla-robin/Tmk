function DesktopWidgetCuadro({ widget, username }) {
  const estilo = getWidgetEstilo(widget.color);
  const etiqueta = formatearTituloWidget(widget.titulo);

  const handleClick = () => {
    registrarUsoWidget(username, widget.id);
  };

  return (
    <a
      href={widget.link}
      target="_blank"
      rel="noopener noreferrer"
      title={widget.titulo}
      onClick={handleClick}
      className={`desktop-widget-cuadro ${estilo.button}`}
    >
      <span className="desktop-widget-cuadro-icon">
        <WidgetIcon iconName={widget.icon} className="w-4 h-4" />
      </span>
      <span className="desktop-widget-cuadro-label">{etiqueta}</span>
    </a>
  );
}

function DesktopWidgetsFila({ titulo, widgets, username }) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <div className="desktop-widgets-fila">
      {titulo ? <span className="desktop-widgets-fila-label">{titulo}</span> : null}
      <div className="desktop-widgets-scroll no-scrollbar">
        {widgets.map((w) => (
          <DesktopWidgetCuadro key={w.id} widget={w} username={username} />
        ))}
      </div>
    </div>
  );
}

function MarcaWidgetsStrip({ widgets, username }) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <section className="marca-widgets-strip" aria-label="Accesos rápidos">
      <span className="marca-widgets-strip-label">Accesos rápidos</span>
      <div className="marca-widgets-scroll no-scrollbar">
        {widgets.map((w) => {
          const estilo = getWidgetEstilo(w.color);
          const etiqueta = formatearTituloWidget(w.titulo);
          return (
            <a
              key={w.id}
              href={w.link}
              target="_blank"
              rel="noopener noreferrer"
              title={w.titulo}
              onClick={() => registrarUsoWidget(username, w.id)}
              className={`marca-widget-chip ${estilo.button}`}
            >
              <WidgetIcon iconName={w.icon} className="w-3.5 h-3.5 shrink-0" />
              <span className="marca-widget-chip-label">{etiqueta}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function DesktopWidgetsPanel({ widgetsAgrupados, username, modoMarca }) {
  const robin = widgetsAgrupados?.robin || [];
  const clientes = widgetsAgrupados?.clientes || [];
  const todos = [...robin, ...clientes];

  if (todos.length === 0) return null;

  if (modoMarca) {
    return (
      <section className="desktop-widgets hidden md:block" aria-label="Accesos rápidos">
        <h3 className="desktop-widgets-heading">Accesos rápidos</h3>
        <div className="desktop-widgets-filas">
          <DesktopWidgetsFila titulo="" widgets={todos} username={username} />
        </div>
      </section>
    );
  }

  return (
    <section className="desktop-widgets hidden md:block" aria-label="Accesos rápidos">
      <h3 className="desktop-widgets-heading">Accesos rápidos</h3>
      <div className="desktop-widgets-filas">
        <DesktopWidgetsFila titulo="Robin" widgets={robin} username={username} />
        <DesktopWidgetsFila titulo="Clientes" widgets={clientes} username={username} />
      </div>
    </section>
  );
}

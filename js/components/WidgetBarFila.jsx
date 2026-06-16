function WidgetBarFila({ titulo, widgets }) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="hidden md:block text-[10px] font-medium text-zinc-500 px-0.5">
        {titulo}
      </span>
      <div className="widget-bar-track flex flex-wrap gap-2 py-0.5 md:flex-nowrap md:overflow-x-auto md:no-scrollbar">
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
              className={`widget-bar-link inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border transition-all shadow-sm hover:shadow-md ${estilo.button}`}
            >
              <WidgetIcon iconName={w.icon} className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span className="text-[13px] font-semibold leading-tight md:whitespace-nowrap">{etiqueta}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

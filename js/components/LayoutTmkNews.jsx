function TmkNewsEdicionArticulo({ noticia, destacada, onSelect }) {
  const meta = resolverEtiquetaCategoriaNoticia(noticia.category);
  const fecha = formatearFechaCortaNoticiaTmk(noticia);
  const autor = noticia.author_display_name || noticia.author_username || "";
  const esNueva = noticiaEsNueva(noticia);
  const bajada = noticia.lead || String(noticia.body || "").slice(0, 220);

  return (
    <button
      type="button"
      className={`tmk-news-edition__item${destacada ? " tmk-news-edition__item--lead" : ""} tmk-news-edition__item--${meta.tone}`}
      onClick={() => onSelect && onSelect(noticia)}
    >
      <div className="tmk-news-edition__item-head">
        <span className={`tmk-news-chip tmk-news-chip--${meta.tone}`}>{meta.label}</span>
        {esNueva && <span className="tmk-news-edition__badge">Nuevo</span>}
        {fecha && <span className="tmk-news-edition__date">{fecha}</span>}
      </div>
      <h2 className="tmk-news-edition__title">{noticia.title}</h2>
      {bajada && <p className="tmk-news-edition__lead">{bajada}</p>}
      <div className="tmk-news-edition__foot">
        {autor && <span className="tmk-news-edition__author">{autor}</span>}
        <span className="tmk-news-edition__read">Leer reportaje</span>
      </div>
    </button>
  );
}

function LayoutTmkNews({
  noticias,
  loading,
  onSelectNoticia,
  onAbrirPublicar,
  theme
}) {
  const lista = Array.isArray(noticias) ? noticias : [];
  const grupos = useMemo(() => agruparNoticiasPorMes(lista), [lista]);
  const fechaHoy = useMemo(() => {
    const raw = new Date().toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const destacada = lista[0] || null;

  return (
    <section className={`tmk-news-edition${theme === "midnight" ? " tmk-news-edition--dark" : ""}`}>
      <header className="tmk-news-edition__header">
        <div className="tmk-news-edition__header-top">
          <div>
            <h1 className="tmk-news-edition__brand">TMK News</h1>
            <p className="tmk-news-edition__subtitle">{fechaHoy}</p>
          </div>
          {onAbrirPublicar && (
            <button type="button" onClick={onAbrirPublicar} className="tmk-news-edition__publish">
              Publicar
              <SVGIcon.ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="tmk-news-edition__kicker">Edición del equipo · últimos 90 días</p>
      </header>

      {loading ? (
        <p className="tmk-news-edition__status">Cargando edición…</p>
      ) : lista.length === 0 ? (
        <div className="tmk-news-edition__empty">
          <p className="tmk-news-edition__status">Aún no hay reportajes publicados.</p>
          {onAbrirPublicar && (
            <button type="button" className="tmk-news-edition__empty-btn" onClick={onAbrirPublicar}>
              Publicar la primera nota
            </button>
          )}
        </div>
      ) : (
        <div className="tmk-news-edition__body">
          {destacada && (
            <TmkNewsEdicionArticulo
              noticia={destacada}
              destacada
              onSelect={onSelectNoticia}
            />
          )}

          {grupos.map((grupo) => {
            const items = grupo.items.filter((n) => !destacada || n.id !== destacada.id);
            if (!items.length) return null;
            return (
              <section key={grupo.titulo} className="tmk-news-edition__group">
                <h3 className="tmk-news-edition__group-title">{grupo.titulo}</h3>
                <div className="tmk-news-edition__list">
                  {items.map((noticia) => (
                    <TmkNewsEdicionArticulo
                      key={noticia.id}
                      noticia={noticia}
                      onSelect={onSelectNoticia}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

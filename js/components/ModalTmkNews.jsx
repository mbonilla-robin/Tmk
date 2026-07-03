function TmkNewsReadAvatar({ author, nombre, avatarUrl }) {
  const etiqueta = nombre || (typeof obtenerNombreAutorComentario === "function"
    ? obtenerNombreAutorComentario(author)
    : author);
  const iniciales = typeof obtenerInicialesAutor === "function"
    ? obtenerInicialesAutor(author, etiqueta)
    : String(etiqueta || "?").charAt(0).toUpperCase();
  const fondo = typeof colorAvatarAutor === "function"
    ? colorAvatarAutor(author)
    : "#e4e4e7";

  if (avatarUrl) {
    return (
      <span
        className="tmk-news-read__avatar tmk-news-read__avatar--photo"
        style={{ backgroundImage: `url(${avatarUrl})` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className="tmk-news-read__avatar" style={{ backgroundColor: fondo }} aria-hidden="true">
      {iniciales}
    </span>
  );
}

function ModalTmkNews({ noticia, onClose, theme }) {
  const [perfilAutor, setPerfilAutor] = useState(null);

  useEffect(() => {
    if (!noticia) return undefined;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose && onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [noticia, onClose]);

  useEffect(() => {
    if (!noticia?.author_username) return undefined;
    let vivo = true;
    (async () => {
      const perfil = await obtenerPerfilUsuario(noticia.author_username);
      if (vivo) setPerfilAutor(perfil);
    })();
    return () => { vivo = false; };
  }, [noticia?.author_username]);

  if (!noticia) return null;

  const meta = resolverEtiquetaCategoriaNoticia(noticia.category);
  const autorNombre = nombreVisiblePerfil(perfilAutor, noticia.author_username)
    || noticia.author_display_name
    || noticia.author_username;
  const avatarUrl = perfilAutor?.avatarUrl || "";

  const tiempo = typeof formatearTiempoRelativo === "function"
    ? formatearTiempoRelativo(noticia.published_at || noticia.created_at)
    : "";
  const fechaCorta = (() => {
    const fecha = new Date(noticia.published_at || noticia.created_at || "");
    if (Number.isNaN(fecha.getTime())) return "";
    const raw = fecha.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  const parrafos = String(noticia.body || "")
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <ModalPortal>
      <div className="tmk-news-read-shell">
        <button
          type="button"
          className="tmk-news-read-shell__backdrop"
          onClick={onClose}
          aria-label="Cerrar"
        />
        <div
          className={`tmk-news-read tmk-news-read--${meta.tone}${theme === "midnight" ? " tmk-news-read--dark" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tmk-news-read-title"
          onClick={(e) => e.stopPropagation()}
        >
        <header className={`tmk-news-read__hero tmk-news-read__hero--${meta.tone}`}>
          <div className="tmk-news-read__hero-noise" aria-hidden="true" />
          <div className={`tmk-news-read__hero-watermark tmk-news-read__hero-watermark--${meta.tone}`} aria-hidden="true">
            <SVGIcon.NewsCategory category={noticia.category} className="tmk-news-read__hero-watermark-svg" />
          </div>

          <div className="tmk-news-read__hero-bar">
            <button type="button" onClick={onClose} className="tmk-news-read__back" aria-label="Cerrar">
              <SVGIcon.ChevronLeft className="tmk-news-read__back-icon" />
            </button>
            <span className={`tmk-news-read__kicker tmk-news-read__kicker--${meta.tone}`}>
              TMK<span className="tmk-news-read__kicker-dot">·</span>News
            </span>
            <span className="tmk-news-read__hero-bar-spacer" aria-hidden="true" />
          </div>

          <div className="tmk-news-read__hero-meta">
            <span className="tmk-news-read__hero-chip">{meta.label}</span>
            {fechaCorta && <span className="tmk-news-read__hero-date">{fechaCorta}</span>}
          </div>

          <h1 id="tmk-news-read-title" className={`tmk-news-read__title tmk-news-read__title--${meta.tone}`}>
            {noticia.title}
          </h1>

          {noticia.lead && (
            <p className="tmk-news-read__lead">{noticia.lead}</p>
          )}
        </header>

        <div className="tmk-news-read__sheet">
          <article className={`tmk-news-read__card tmk-news-read__card--${meta.tone}`}>
            <div className="tmk-news-read__body">
              {parrafos.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <footer className={`tmk-news-read__footer tmk-news-read__footer--${meta.tone}`}>
            <TmkNewsReadAvatar
              author={noticia.author_username}
              nombre={autorNombre}
              avatarUrl={avatarUrl}
            />
            <div className="tmk-news-read__footer-copy">
              <span className="tmk-news-read__author">{autorNombre}</span>
              {tiempo && (
                <span className="tmk-news-read__time-row">
                  <SVGIcon.Clock className="tmk-news-read__time-icon" />
                  <span>{tiempo}</span>
                </span>
              )}
            </div>
            </footer>
          </article>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
}

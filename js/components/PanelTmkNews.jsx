function TmkNewsCategoriaPills({ value, onChange }) {
  return (
    <div className="tmk-news-panel__pills" role="listbox" aria-label="Categoría">
      {Object.entries(TMK_NEWS_CATEGORIAS).map(([key, meta]) => {
        const activa = value === key;
        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={activa}
            onClick={() => onChange(key)}
            className={`tmk-news-panel__pill tmk-news-panel__pill--${meta.tone}${activa ? " is-active" : ""}`}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function PanelTmkNews({
  usuario,
  nombreUsuario,
  currentTheme,
  theme,
  onPublicado,
  showToast
}) {
  const [paso, setPaso] = useState("escribir");
  const [rawInput, setRawInput] = useState("");
  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [lead, setLead] = useState("");
  const [body, setBody] = useState("");
  const [redactando, setRedactando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [recientes, setRecientes] = useState([]);
  const [cargandoRecientes, setCargandoRecientes] = useState(true);

  const nombreVisible = nombreUsuario || `@${usuario}`;
  const esOscuro = theme === "midnight";

  const cargarRecientes = useCallback(async () => {
    setCargandoRecientes(true);
    try {
      const rows = await fetchNoticiasTmk({ dias: 14 });
      setRecientes(rows);
    } finally {
      setCargandoRecientes(false);
    }
  }, []);

  useEffect(() => {
    cargarRecientes();
  }, [cargarRecientes]);

  const resetFormulario = () => {
    setPaso("escribir");
    setRawInput("");
    setCategory("general");
    setTitle("");
    setLead("");
    setBody("");
  };

  const handleRedactar = async () => {
    if (!rawInput.trim()) {
      showToast && showToast("Escribe tu nota antes de redactar", "info");
      return;
    }

    setRedactando(true);
    try {
      const resultado = await redactarNoticiaConIA({
        rawInput: rawInput.trim(),
        authorName: nombreVisible
      });

      if (!resultado.ok) {
        showToast && showToast(resultado.error || "No se pudo redactar", "error");
        return;
      }

      setTitle(resultado.title || "");
      setLead(resultado.lead || "");
      setBody(resultado.body || "");
      setPaso("preview");
    } finally {
      setRedactando(false);
    }
  };

  const handlePublicar = async () => {
    if (!title.trim() || !body.trim()) {
      showToast && showToast("Título y cuerpo son obligatorios", "info");
      return;
    }

    setPublicando(true);
    try {
      const resultado = await publicarNoticiaTmk({
        authorUsername: usuario,
        authorDisplayName: nombreVisible,
        rawInput: rawInput.trim(),
        title: title.trim(),
        lead: lead.trim(),
        body: body.trim(),
        category
      });

      if (!resultado.ok) {
        showToast && showToast(resultado.error || "No se pudo publicar", "error");
        return;
      }

      showToast && showToast("Noticia publicada en TMK News", "success");
      resetFormulario();
      await cargarRecientes();
      if (typeof onPublicado === "function") onPublicado(resultado.noticia);
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className={`tmk-news-panel${esOscuro ? " tmk-news-panel--dark" : ""}`}>
      <header className="tmk-news-panel__hero">
        <div className="tmk-news-panel__brand-row">
          <span className="tmk-news-panel__brand-mark">TMK</span>
          <span className="tmk-news-panel__brand-name">News</span>
        </div>
        <p className="tmk-news-panel__intro">
          Escribe en primera persona. El equipo lo verá redactado como noticia interna.
        </p>
        <div className="tmk-news-panel__steps" aria-hidden="true">
          <span className={`tmk-news-panel__step${paso === "escribir" ? " is-active" : ""}`}>1. Nota</span>
          <span className="tmk-news-panel__step-sep" />
          <span className={`tmk-news-panel__step${paso === "preview" ? " is-active" : ""}`}>2. Revisar</span>
        </div>
      </header>

      <section className="tmk-news-panel__composer">
        {paso === "escribir" ? (
          <>
            <label className="tmk-news-panel__doc">
              <span className="tmk-news-panel__field-label">Tu nota</span>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Ej: Yo no voy a estar disponible el martes y miércoles por mi graduación"
                className="tmk-news-panel__textarea"
                rows={5}
              />
            </label>

            <div className="tmk-news-panel__meta-block">
              <span className="tmk-news-panel__field-label">Categoría</span>
              <TmkNewsCategoriaPills value={category} onChange={setCategory} />
            </div>

            <div className="tmk-news-panel__actions">
              <button
                type="button"
                onClick={handleRedactar}
                disabled={redactando || !rawInput.trim()}
                className="tmk-news-panel__btn tmk-news-panel__btn--primary"
              >
                {redactando ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
                    Redactando…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles tmk-news-panel__btn-icon" aria-hidden="true" />
                    Redactar para el equipo
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="tmk-news-panel__preview">
              <div className="tmk-news-panel__preview-head">
                <span className="tmk-news-panel__field-label">Vista previa</span>
                <TmkNewsCategoriaChip category={category} />
              </div>

              <label className="tmk-news-panel__preview-field">
                <span className="tmk-news-panel__field-label">Titular</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="tmk-news-panel__input tmk-news-panel__input--title"
                />
              </label>

              <label className="tmk-news-panel__preview-field">
                <span className="tmk-news-panel__field-label">Subtítulo</span>
                <input
                  type="text"
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  className="tmk-news-panel__input"
                />
              </label>

              <label className="tmk-news-panel__preview-field">
                <span className="tmk-news-panel__field-label">Cuerpo</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="tmk-news-panel__textarea tmk-news-panel__textarea--body"
                  rows={6}
                />
              </label>
            </div>

            <div className="tmk-news-panel__actions tmk-news-panel__actions--split">
              <button
                type="button"
                onClick={() => setPaso("escribir")}
                className="tmk-news-panel__btn tmk-news-panel__btn--ghost"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleRedactar}
                disabled={redactando}
                className="tmk-news-panel__btn tmk-news-panel__btn--ghost"
              >
                {redactando ? "Redactando…" : "Redactar de nuevo"}
              </button>
              <button
                type="button"
                onClick={handlePublicar}
                disabled={publicando}
                className="tmk-news-panel__btn tmk-news-panel__btn--primary"
              >
                {publicando ? "Publicando…" : "Publicar"}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="tmk-news-panel__recents">
        <div className="tmk-news-panel__recents-head">
          <h3 className="tmk-news-panel__recents-title">Publicaciones recientes</h3>
          {!cargandoRecientes && recientes.length > 0 && (
            <span className="tmk-news-panel__recents-count">{recientes.length}</span>
          )}
        </div>

        {cargandoRecientes ? (
          <div className="tmk-news-panel__empty">
            <span className="tmk-news-panel__empty-dot" />
            Cargando…
          </div>
        ) : recientes.length === 0 ? (
          <div className="tmk-news-panel__empty">
            <span className="tmk-news-panel__empty-icon" aria-hidden="true">
              <i className="fa-regular fa-newspaper" />
            </span>
            <p>Aún no hay noticias publicadas.</p>
            <span className="tmk-news-panel__empty-hint">Sé el primero en compartir algo con el equipo.</span>
          </div>
        ) : (
          <ul className="tmk-news-panel__list">
            {recientes.slice(0, 8).map((noticia) => {
              const tiempo = typeof formatearTiempoRelativo === "function"
                ? formatearTiempoRelativo(noticia.published_at || noticia.created_at)
                : "";
              const meta = resolverEtiquetaCategoriaNoticia(noticia.category);
              return (
                <li key={noticia.id} className="tmk-news-panel__list-item">
                  <div className="tmk-news-panel__list-main">
                    <span className={`tmk-news-panel__list-dot tmk-news-panel__list-dot--${meta.tone}`} aria-hidden="true" />
                    <div className="tmk-news-panel__list-copy">
                      <p className="tmk-news-panel__list-title">{noticia.title}</p>
                      <p className="tmk-news-panel__list-meta">
                        {noticia.author_display_name || noticia.author_username}
                        {tiempo ? ` · ${tiempo}` : ""}
                      </p>
                    </div>
                  </div>
                  <TmkNewsCategoriaChip category={noticia.category} className="tmk-news-panel__list-chip" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

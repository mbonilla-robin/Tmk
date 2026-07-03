function TmkNewsCategoryIcon({ category, className = "tmk-news-cat-icon__svg" }) {
  const meta = resolverEtiquetaCategoriaNoticia(category);
  const icons = {
    ausencia: SVGIcon.NewsAusencia,
    aviso: SVGIcon.NewsAviso,
    robin: SVGIcon.NewsRobin,
    marca: SVGIcon.NewsMarca,
    celebracion: SVGIcon.NewsCelebracion,
    general: SVGIcon.NewsGeneral
  };
  const Icon = icons[meta.tone] || SVGIcon.NewsGeneral;
  return (
    <span className={`tmk-news-cat-icon tmk-news-cat-icon--${meta.tone}`} aria-hidden="true">
      <Icon className={className} />
    </span>
  );
}

function TmkNewsCategoriaChip({ category, className = "" }) {
  const meta = resolverEtiquetaCategoriaNoticia(category);
  return (
    <span className={`tmk-news-chip tmk-news-chip--${meta.tone} ${className}`.trim()}>
      {meta.label}
    </span>
  );
}

function obtenerOffsetCircularTmkNews(index, activo, total) {
  if (total <= 1) return 0;
  let diff = index - activo;
  const mitad = total / 2;
  if (diff > mitad) diff -= total;
  if (diff < -mitad) diff += total;
  return diff;
}

function resolverTonosFantasmaTmkNews(toneCentral) {
  const izq = toneCentral === "ausencia" ? "marca" : "ausencia";
  const der = toneCentral === "celebracion" ? "robin" : "celebracion";
  return { izq, der };
}

function TmkNewsCardGhost({ tone, desktop = false }) {
  const claseExtra = desktop ? " tmk-news-hero-card" : "";
  return (
    <div className={`tmk-news-card tmk-news-card--${tone} tmk-news-card--ghost tmk-news-card--side${claseExtra}`} aria-hidden="true">
      <span className="tmk-news-card__noise" aria-hidden="true" />
      <span className={`tmk-news-card__watermark tmk-news-card__watermark--${tone}${desktop ? " tmk-news-card__watermark--hero" : ""}`} aria-hidden="true">
        <SVGIcon.NewsCategory category={tone} className="tmk-news-card__watermark-svg" />
      </span>
      <div className="tmk-news-card__ghost-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function HomeTmkNewsCard({ noticia, onSelect, activa = false }) {
  const meta = resolverEtiquetaCategoriaNoticia(noticia.category);
  const esNueva = noticiaEsNueva(noticia);
  const tiempo = typeof formatearTiempoRelativo === "function"
    ? formatearTiempoRelativo(noticia.published_at || noticia.created_at)
    : "";

  return (
    <button
      type="button"
      className={`tmk-news-card tmk-news-card--${meta.tone}${activa ? " tmk-news-card--active" : " tmk-news-card--side"}`}
      onClick={() => onSelect && onSelect(noticia)}
    >
      <span className="tmk-news-card__noise" aria-hidden="true" />
      <span className={`tmk-news-card__watermark tmk-news-card__watermark--${meta.tone}`} aria-hidden="true">
        <SVGIcon.NewsCategory category={noticia.category} className="tmk-news-card__watermark-svg" />
      </span>

      <div className="tmk-news-card__top">
        <span className="tmk-news-card__chip">{meta.label}</span>
        {esNueva && activa && <span className="tmk-news-card__badge">Nuevo</span>}
      </div>
      <p className="tmk-news-card__title">{noticia.title}</p>
      {activa && (
        <p className="tmk-news-card__lead">{noticia.lead || noticia.body}</p>
      )}
      <div className="tmk-news-card__foot">
        <span className="tmk-news-card__author">{noticia.author_display_name || noticia.author_username}</span>
        {tiempo && activa && <span className="tmk-news-card__time">{tiempo}</span>}
      </div>
    </button>
  );
}

function HomeTmkNewsHeroCard({ noticia, onSelect, activa = false }) {
  const meta = resolverEtiquetaCategoriaNoticia(noticia.category);
  const esNueva = noticiaEsNueva(noticia);
  const tiempo = typeof formatearTiempoRelativo === "function"
    ? formatearTiempoRelativo(noticia.published_at || noticia.created_at)
    : "";

  return (
    <button
      type="button"
      className={`tmk-news-hero-card tmk-news-card tmk-news-card--${meta.tone}${activa ? " tmk-news-hero-card--active tmk-news-card--active" : " tmk-news-hero-card--side tmk-news-card--side"}`}
      onClick={() => onSelect && onSelect(noticia)}
    >
      <span className="tmk-news-card__noise" aria-hidden="true" />
      <span className={`tmk-news-card__watermark tmk-news-card__watermark--${meta.tone} tmk-news-card__watermark--hero`} aria-hidden="true">
        <SVGIcon.NewsCategory category={noticia.category} className="tmk-news-card__watermark-svg" />
      </span>

      <div className="tmk-news-hero-card__content">
        <div className="tmk-news-hero-card__meta">
          <span className="tmk-news-card__chip">{meta.label}</span>
          {esNueva && activa && <span className="tmk-news-card__badge">Nuevo</span>}
          {activa && (
            <span className="tmk-news-hero-card__kicker">
              TMK<span className="tmk-news-read__kicker-dot">·</span>News
            </span>
          )}
        </div>
        <p className="tmk-news-hero-card__title">{noticia.title}</p>
        {activa && (
          <p className="tmk-news-hero-card__lead">{noticia.lead || noticia.body}</p>
        )}
        <div className="tmk-news-hero-card__foot">
          <span className="tmk-news-hero-card__author">{noticia.author_display_name || noticia.author_username}</span>
          {tiempo && activa && <span className="tmk-news-hero-card__time">{tiempo}</span>}
        </div>
      </div>
    </button>
  );
}

function TmkNewsCarousel({ noticias, onSelectNoticia, variant = "mobile" }) {
  const lista = Array.isArray(noticias) ? noticias : [];
  const total = lista.length;
  const esDesktop = variant === "desktop";
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const pausaTimerRef = useRef(null);
  const stageRef = useRef(null);

  const CardComponent = esDesktop ? HomeTmkNewsHeroCard : HomeTmkNewsCard;

  useEffect(() => {
    setActivo(0);
  }, [total]);

  const reanudarDespues = useCallback(() => {
    if (pausaTimerRef.current) clearTimeout(pausaTimerRef.current);
    pausaTimerRef.current = setTimeout(() => setPausado(false), 8000);
  }, []);

  const pausar = useCallback(() => {
    setPausado(true);
    reanudarDespues();
  }, [reanudarDespues]);

  const irAnterior = useCallback(() => {
    if (total <= 1) return;
    setActivo((prev) => (prev - 1 + total) % total);
    pausar();
  }, [total, pausar]);

  const irSiguiente = useCallback(() => {
    if (total <= 1) return;
    setActivo((prev) => (prev + 1) % total);
    pausar();
  }, [total, pausar]);

  useEffect(() => () => {
    if (pausaTimerRef.current) clearTimeout(pausaTimerRef.current);
  }, []);

  useEffect(() => {
    if (total <= 1 || pausado) return undefined;

    let preferReduced = false;
    try {
      preferReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      preferReduced = false;
    }
    if (preferReduced) return undefined;

    const id = setInterval(() => {
      setActivo((prev) => (prev + 1) % total);
    }, 5000);

    return () => clearInterval(id);
  }, [total, pausado]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || total <= 1) return undefined;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (clientX, clientY) => {
      pausar();
      startX = clientX;
      startY = clientY;
      tracking = true;
    };

    const onMove = (clientX, clientY, prevent) => {
      if (!tracking) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8 && prevent) {
        prevent();
      }
    };

    const onEnd = (clientX, clientY) => {
      if (!tracking) return;
      tracking = false;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.abs(dy) > 50) return;
      if (dx < -36) irSiguiente();
      else if (dx > 36) irAnterior();
    };

    const onTouchStart = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      onStart(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      onMove(touch.clientX, touch.clientY, () => e.preventDefault());
    };

    const onTouchEnd = (e) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      onEnd(touch.clientX, touch.clientY);
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      onStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e) => {
      onMove(e.clientX, e.clientY, null);
    };

    const onMouseUp = (e) => {
      onEnd(e.clientX, e.clientY);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [total, pausar, irAnterior, irSiguiente]);

  if (total === 0) return null;

  const carouselClase = [
    "tmk-news-carousel",
    esDesktop ? "tmk-news-carousel--desktop" : "",
    total === 1 ? "tmk-news-carousel--single" : ""
  ].filter(Boolean).join(" ");

  if (total === 1) {
    const meta = resolverEtiquetaCategoriaNoticia(lista[0].category);
    const fantasmas = resolverTonosFantasmaTmkNews(meta.tone);
    return (
      <div className={carouselClase}>
        <div className="tmk-news-carousel__stage">
          <div className="tmk-news-carousel__slide tmk-news-carousel__slide--left tmk-news-carousel__slide--static">
            <TmkNewsCardGhost tone={fantasmas.izq} desktop={esDesktop} />
          </div>
          <div className="tmk-news-carousel__slide tmk-news-carousel__slide--center">
            <CardComponent noticia={lista[0]} onSelect={onSelectNoticia} activa />
          </div>
          <div className="tmk-news-carousel__slide tmk-news-carousel__slide--right tmk-news-carousel__slide--static">
            <TmkNewsCardGhost tone={fantasmas.der} desktop={esDesktop} />
          </div>
        </div>
        <div className="tmk-news-carousel__dots" aria-hidden="true">
          <span className="tmk-news-carousel__dot is-active" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={carouselClase}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => {
        setPausado(false);
        if (pausaTimerRef.current) clearTimeout(pausaTimerRef.current);
      }}
    >
      <div ref={stageRef} className="tmk-news-carousel__stage" aria-live="polite">
        {lista.map((noticia, index) => {
          const offset = obtenerOffsetCircularTmkNews(index, activo, total);
          const offsetClase = offset === 0
            ? "center"
            : offset === -1
              ? "left"
              : offset === 1
                ? "right"
                : "hidden";

          return (
            <div
              key={noticia.id}
              className={`tmk-news-carousel__slide tmk-news-carousel__slide--${offsetClase}`}
              aria-hidden={offset !== 0}
            >
              <CardComponent
                noticia={noticia}
                onSelect={onSelectNoticia}
                activa={offset === 0}
              />
            </div>
          );
        })}
      </div>

      <div className="tmk-news-carousel__dots" role="tablist" aria-label="Novedades">
        {lista.map((noticia, index) => (
          <button
            key={noticia.id}
            type="button"
            role="tab"
            aria-selected={index === activo}
            aria-label={`Novedad ${index + 1}`}
            className={`tmk-news-carousel__dot${index === activo ? " is-active" : ""}`}
            onClick={() => {
              setActivo(index);
              pausar();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function HomeTmkNews({ noticias, onSelectNoticia, onAbrirPublicar, loading, variant = "mobile" }) {
  const lista = Array.isArray(noticias) ? noticias : [];
  const esDesktop = variant === "desktop";

  if (esDesktop && !loading && lista.length === 0) {
    return null;
  }

  return (
    <section
      className={`home-section tmk-news-home${esDesktop ? " tmk-news-home--desktop" : ""}`}
      data-induccion="tmk-news"
    >
      <div className="home-section__head">
        <div className="home-section__head-left">
          <span className="home-section__title tmk-news-home__brand">TMK News</span>
          <span className="home-section__subtitle">Novedades de la semana</span>
        </div>
        {onAbrirPublicar && (
          <button type="button" onClick={onAbrirPublicar} className="home-section__link">
            Publicar
            <SVGIcon.ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading ? (
        <p className="home-section__empty">Cargando novedades…</p>
      ) : lista.length === 0 ? (
        <div className="tmk-news-home__empty">
          <p className="home-section__empty">Sin novedades esta semana</p>
          {onAbrirPublicar && (
            <button type="button" onClick={onAbrirPublicar} className="tmk-news-home__empty-btn">
              Comparte algo con el equipo
            </button>
          )}
        </div>
      ) : (
        <TmkNewsCarousel noticias={lista} onSelectNoticia={onSelectNoticia} variant={variant} />
      )}
    </section>
  );
}

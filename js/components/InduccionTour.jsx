function obtenerChromeInferiorPx() {
  const nav = document.querySelector(".mobile-nav-bar");
  if (nav) {
    const rect = nav.getBoundingClientRect();
    if (rect.height > 0) return Math.max(rect.height, window.innerHeight - rect.top);
  }

  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;height:var(--mobile-chrome-bottom,4rem);pointer-events:none;visibility:hidden;";
  document.body.appendChild(probe);
  const measured = probe.offsetHeight;
  probe.remove();
  return measured > 0 ? measured : 64;
}

function obtenerHeaderSuperiorPx() {
  const header = document.querySelector(".mobile-top-bar, header.robin-mobile-chrome");
  if (header) {
    const rect = header.getBoundingClientRect();
    if (rect.height > 0) return Math.max(rect.bottom, 0);
  }

  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;height:var(--mobile-chrome-top,4rem);pointer-events:none;visibility:hidden;";
  document.body.appendChild(probe);
  const measured = probe.offsetHeight;
  probe.remove();
  return measured > 0 ? measured : 64;
}

function obtenerRadioHighlight(el) {
  if (!el) return 10;
  const s = window.getComputedStyle(el);
  const valores = [
    s.borderTopLeftRadius,
    s.borderTopRightRadius,
    s.borderBottomRightRadius,
    s.borderBottomLeftRadius
  ].map((v) => parseFloat(v) || 0);
  return Math.max(...valores, 8);
}

function rectsIguales(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.top - b.top) < 1
    && Math.abs(a.left - b.left) < 1
    && Math.abs(a.width - b.width) < 1
    && Math.abs(a.height - b.height) < 1;
}

function InduccionTourShade({ rect }) {
  if (!rect) {
    return <div className="induccion-tour__shade induccion-tour__shade--full" aria-hidden="true" />;
  }

  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;

  return (
    <>
      <div className="induccion-tour__shade" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} aria-hidden="true" />
      <div
        className="induccion-tour__shade"
        style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }}
        aria-hidden="true"
      />
      <div
        className="induccion-tour__shade"
        style={{ top: rect.top, left: right, right: 0, height: rect.height }}
        aria-hidden="true"
      />
      <div
        className="induccion-tour__shade"
        style={{ top: bottom, left: 0, right: 0, bottom: 0 }}
        aria-hidden="true"
      />
    </>
  );
}

function InduccionTour({
  activo,
  pasos,
  pasoIndex,
  onSiguiente,
  onAnterior,
  onSaltar,
  onCerrar
}) {
  const paso = pasos[pasoIndex];
  const [rect, setRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [pointer, setPointer] = useState(null);
  const [esMobile, setEsMobile] = useState(false);
  const [fallbackCentro, setFallbackCentro] = useState(false);
  const tooltipRef = useRef(null);
  const litRef = useRef(null);
  const rectPersistenteRef = useRef(null);
  const recalcFrameRef = useRef(null);
  const recalcTimersRef = useRef([]);
  const fallbackActivoRef = useRef(false);
  const esCentroRef = useRef(false);

  const targetId = typeof obtenerTargetIdInduccion === "function"
    ? obtenerTargetIdInduccion(paso)
    : (paso?.target || null);
  const esEstiloIntro = !!paso?.estiloIntro;
  const esCentro = esEstiloIntro || !targetId || paso?.placement === "center";
  esCentroRef.current = esCentro;
  const esTarjetaCentrada = esCentro || fallbackCentro;
  const total = pasos.length;
  const esPrimero = pasoIndex === 0;
  const esUltimo = pasoIndex >= total - 1;
  const esPasoFinal = esUltimo && esCentro && !esEstiloIntro;

  const resolverElementoTarget = useCallback(() => {
    if (!targetId) return null;
    return typeof encontrarElementoInduccion === "function"
      ? encontrarElementoInduccion(targetId)
      : document.querySelector(`[data-induccion="${targetId}"]`);
  }, [targetId]);

  const limpiarRecalcProgramado = useCallback(() => {
    if (recalcFrameRef.current) {
      cancelAnimationFrame(recalcFrameRef.current);
      recalcFrameRef.current = null;
    }
    recalcTimersRef.current.forEach(clearTimeout);
    recalcTimersRef.current = [];
  }, []);

  const actualizarPosicion = useCallback(() => {
    const mobile = window.innerWidth < 1024;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setEsMobile(mobile);

    if (!activo || !paso || esCentroRef.current || fallbackActivoRef.current) {
      return;
    }

    const el = resolverElementoTarget();
    if (!el) {
      if (rectPersistenteRef.current) {
        rectPersistenteRef.current = null;
        setRect(null);
      }
      return;
    }

    const nodoHighlight = typeof obtenerElementoHighlightInduccion === "function"
      ? obtenerElementoHighlightInduccion(el, targetId)
      : el;
    const rawCheck = nodoHighlight?.getBoundingClientRect();
    const headerReserve = mobile ? obtenerHeaderSuperiorPx() : 0;
    const chromeBottom = mobile ? obtenerChromeInferiorPx() : 0;

    const visibleEnViewport = typeof elementoEstaEnViewportInduccion === "function"
      ? elementoEstaEnViewportInduccion(nodoHighlight, headerReserve, chromeBottom)
      : true;

    if (!visibleEnViewport) {
      nodoHighlight.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      if (rectPersistenteRef.current) {
        rectPersistenteRef.current = null;
        setRect(null);
      }
      return;
    }

    const padding = mobile ? 5 : 6;
    let highlight = typeof obtenerRectHighlightInduccion === "function"
      ? obtenerRectHighlightInduccion(el, targetId, padding)
      : null;

    if (!highlight) {
      const raw = el.getBoundingClientRect();
      highlight = {
        top: raw.top - padding,
        left: raw.left - padding,
        width: raw.width + padding * 2,
        height: raw.height + padding * 2,
        radius: obtenerRadioHighlight(el) + 2
      };
    }

    const margin = 8;
    const gap = mobile ? 10 : 10;
    const maxCutoutW = vw - margin * 2;
    const maxCutoutH = Math.floor(vh * (mobile ? 0.55 : 0.62));

    if (highlight.width > maxCutoutW || highlight.height > maxCutoutH) {
      const radius = highlight.radius;
      const acotar = (highlight.height > maxCutoutH && typeof acotarRectInduccionDesdeArriba === "function")
        ? acotarRectInduccionDesdeArriba
        : acotarRectInduccion;
      if (typeof acotar === "function") {
        highlight = acotar(highlight, maxCutoutW, maxCutoutH, vw, vh, margin);
        highlight.radius = radius;
      }
    }

    if (!rectsIguales(rectPersistenteRef.current, highlight)) {
      rectPersistenteRef.current = highlight;
      setRect(highlight);
    }

    if (fallbackActivoRef.current) {
      fallbackActivoRef.current = false;
      setFallbackCentro(false);
    }

    const tooltipW = mobile ? vw - margin * 2 : 248;
    const tooltipH = tooltipRef.current?.offsetHeight || (mobile ? 136 : 140);
    const placement = paso.placement || "bottom";
    const highlightBottom = highlight.top + highlight.height;
    const highlightNearBottom = highlightBottom > vh - chromeBottom - 16;
    const targetCx = highlight.left + highlight.width / 2;

    let top = 0;
    let left = 0;
    let mobileBottom = null;
    let nextPointer = null;
    let nextTooltipStyle = {};

    if (mobile) {
      const cardWidth = vw - margin * 2;
      const cardLeft = margin;

      if (highlightNearBottom) {
        mobileBottom = Math.max(10, vh - highlight.top + gap);
      } else {
        const spaceAbove = highlight.top - headerReserve - margin;
        const spaceBelow = vh - chromeBottom - highlightBottom - gap;

        if (spaceBelow >= tooltipH + gap) {
          top = highlightBottom + gap;
        } else if (spaceAbove >= tooltipH + gap) {
          top = Math.max(headerReserve + margin, highlight.top - gap - tooltipH);
        } else {
          mobileBottom = chromeBottom + 10;
        }
      }

      if (mobileBottom != null) {
        const cardTop = vh - mobileBottom - tooltipH;
        if (cardTop < headerReserve + margin) {
          mobileBottom = Math.max(10, vh - headerReserve - margin - tooltipH);
        }
      } else {
        top = Math.min(top, vh - chromeBottom - tooltipH - 10);
        top = Math.max(headerReserve + margin, top);
      }

      const cardTop = mobileBottom != null ? vh - mobileBottom - tooltipH : top;
      const cardBottom = cardTop + tooltipH;

      if (cardTop >= highlightBottom + 4) {
        nextPointer = {
          side: "top",
          offset: Math.min(Math.max(28, targetCx - cardLeft), cardWidth - 28)
        };
      } else if (cardBottom <= highlight.top - 4) {
        nextPointer = {
          side: "bottom",
          offset: Math.min(Math.max(28, targetCx - cardLeft), cardWidth - 28)
        };
      } else if (mobileBottom != null) {
        nextPointer = {
          side: "top",
          offset: Math.min(Math.max(28, targetCx - cardLeft), cardWidth - 28)
        };
      }

      nextTooltipStyle = mobileBottom != null
        ? { left: margin, right: margin, width: "auto", bottom: mobileBottom }
        : { left: margin, right: margin, width: "auto", top };
    } else {
      const placements = [placement, "bottom", "top", "right", "left"];
      let placed = false;

      for (let i = 0; i < placements.length && !placed; i++) {
        const p = placements[i];
        let t = 0;
        let l = 0;

        if (p === "top") {
          t = highlight.top - tooltipH - gap;
          l = highlight.left + highlight.width / 2 - tooltipW / 2;
        } else if (p === "left") {
          t = highlight.top + highlight.height / 2 - tooltipH / 2;
          l = highlight.left - tooltipW - gap;
        } else if (p === "right") {
          t = highlight.top + highlight.height / 2 - tooltipH / 2;
          l = highlight.left + highlight.width + gap;
        } else {
          t = highlight.top + highlight.height + gap;
          l = highlight.left + highlight.width / 2 - tooltipW / 2;
        }

        const maxLeft = vw - tooltipW - margin;
        l = Math.min(Math.max(margin, l), maxLeft);
        t = Math.min(Math.max(margin, t), vh - tooltipH - margin);

        const overlapsTarget = !(
          l + tooltipW < highlight.left ||
          l > highlight.left + highlight.width ||
          t + tooltipH < highlight.top ||
          t > highlight.top + highlight.height
        );

        if (!overlapsTarget || i === placements.length - 1) {
          top = t;
          left = l;
          placed = true;

          const cardRight = l + tooltipW;
          const overlapsX = targetCx >= l && targetCx <= cardRight;

          if (p === "bottom" && overlapsX) {
            nextPointer = { side: "top", offset: targetCx - l };
          } else if (p === "top" && overlapsX) {
            nextPointer = { side: "bottom", offset: targetCx - l };
          } else if (p === "right") {
            nextPointer = { side: "left", offset: highlight.top + highlight.height / 2 - t };
          } else if (p === "left") {
            nextPointer = { side: "right", offset: highlight.top + highlight.height / 2 - t };
          }
        }
      }

      nextTooltipStyle = { top, left, width: tooltipW };
    }

    setTooltipStyle((prev) => {
      const keys = Object.keys(nextTooltipStyle);
      if (keys.length !== Object.keys(prev).length) return nextTooltipStyle;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (prev[key] !== nextTooltipStyle[key]) return nextTooltipStyle;
      }
      return prev;
    });
    setPointer(nextPointer);
  }, [activo, paso, targetId, resolverElementoTarget]);

  const programarActualizacion = useCallback(() => {
    limpiarRecalcProgramado();
    recalcFrameRef.current = requestAnimationFrame(() => {
      actualizarPosicion();
    });
  }, [actualizarPosicion, limpiarRecalcProgramado]);

  const scrollAlTarget = useCallback(() => {
    if (!activo || esCentroRef.current || fallbackActivoRef.current || !targetId) return;

    const el = resolverElementoTarget();
    if (!el) return;

    const nodoHighlight = typeof obtenerElementoHighlightInduccion === "function"
      ? obtenerElementoHighlightInduccion(el, targetId)
      : el;

    const mobile = window.innerWidth < 1024;
    const raw = nodoHighlight.getBoundingClientRect();
    const chromeBottom = mobile ? obtenerChromeInferiorPx() : 0;
    const headerReserve = mobile ? obtenerHeaderSuperiorPx() : 0;
    const vh = window.innerHeight;
    const enVista = raw.top >= headerReserve - 4
      && raw.bottom <= vh - chromeBottom + 4
      && raw.left >= 0
      && raw.right <= window.innerWidth;

    if (enVista && !paso?.scrollTarget) return;

    const targetNearBottom = mobile && raw.bottom > vh - chromeBottom - 24;
    nodoHighlight.scrollIntoView({
      block: paso?.scrollTarget ? "center" : (targetNearBottom ? "end" : (mobile ? "nearest" : "center")),
      behavior: "auto",
      inline: "nearest"
    });
  }, [activo, targetId, resolverElementoTarget, paso]);

  useLayoutEffect(() => {
    rectPersistenteRef.current = null;
    fallbackActivoRef.current = false;
    setRect(null);
    setFallbackCentro(false);
    setTooltipStyle({});
    setPointer(null);
    limpiarRecalcProgramado();

    if (!activo || esEstiloIntro) return undefined;

    scrollAlTarget();
    programarActualizacion();
    recalcTimersRef.current = [220, 520, 900, 1300].map((ms) => setTimeout(programarActualizacion, ms));

    if (targetId) {
      const fallbackTimer = setTimeout(() => {
        if (rectPersistenteRef.current) return;
        fallbackActivoRef.current = true;
        setFallbackCentro(true);
      }, 1500);
      recalcTimersRef.current.push(fallbackTimer);
    }

    return limpiarRecalcProgramado;
  }, [activo, pasoIndex, targetId, esEstiloIntro, limpiarRecalcProgramado]);

  useEffect(() => {
    if (!activo || esTarjetaCentrada || !targetId) {
      if (litRef.current) {
        litRef.current.classList.remove("is-induccion-lit");
        litRef.current = null;
      }
      return undefined;
    }

    const el = resolverElementoTarget();
    if (litRef.current && litRef.current !== el) {
      litRef.current.classList.remove("is-induccion-lit");
    }

    if (el) {
      el.classList.add("is-induccion-lit");
      litRef.current = el;
    }

    return () => {
      if (litRef.current) {
        litRef.current.classList.remove("is-induccion-lit");
        litRef.current = null;
      }
    };
  }, [activo, pasoIndex, esTarjetaCentrada, targetId, resolverElementoTarget]);

  useEffect(() => {
    if (!activo) return undefined;

    const onResize = () => programarActualizacion();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    const onRecalc = () => {
      scrollAlTarget();
      programarActualizacion();
    };
    window.addEventListener("induccion-recalc", onRecalc);

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("induccion-recalc", onRecalc);
      limpiarRecalcProgramado();
    };
  }, [activo, scrollAlTarget, programarActualizacion, limpiarRecalcProgramado]);

  useEffect(() => {
    if (!activo) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onSaltar();
      if (e.key === "ArrowRight" || e.key === "Enter") onSiguiente();
      if (e.key === "ArrowLeft" && !esPrimero) onAnterior();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activo, esPrimero, onSiguiente, onAnterior, onSaltar]);

  if (!activo || !paso) return null;

  const handleSaltar = () => {
    if (esUltimo) {
      onCerrar();
      return;
    }
    if (window.confirm("¿Saltar la inducción? Puedes verla en Ajustes → Opciones avanzadas.")) {
      onSaltar();
    }
  };

  const estiloTarjetaPorDefecto = esMobile && !esTarjetaCentrada && !rect
    ? { left: 8, right: 8, width: "auto", bottom: obtenerChromeInferiorPx() + 10 }
    : undefined;

  const renderTarjeta = (clasesExtra = "") => (
    <div
      ref={tooltipRef}
      className={[
        "induccion-tour__card",
        esTarjetaCentrada ? "is-centered" : "",
        esPasoFinal ? "is-final-step" : "",
        esMobile && !esTarjetaCentrada ? "is-mobile-dock" : "",
        pointer ? `has-pointer-${pointer.side}` : "",
        clasesExtra
      ].filter(Boolean).join(" ")}
      style={{
        ...(esTarjetaCentrada ? undefined : (Object.keys(tooltipStyle).length ? tooltipStyle : estiloTarjetaPorDefecto)),
        ...(pointer ? { "--induccion-pointer-x": `${pointer.offset}px` } : {})
      }}
    >
      <div className="induccion-tour__progress" aria-hidden="true">
        <span className="induccion-tour__progress-fill" style={{ width: `${((pasoIndex + 1) / total) * 100}%` }} />
      </div>
      <div className="induccion-tour__card-head">
        <span className="induccion-tour__step-badge">{pasoIndex + 1}/{total}</span>
        <button type="button" className="induccion-tour__close" onClick={handleSaltar} aria-label="Cerrar inducción">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <h2 id="induccion-tour-title" className="induccion-tour__title">{paso.titulo}</h2>
      <div className={`induccion-tour__body${esEstiloIntro ? " induccion-tour__body--final" : ""}`}>
        <p className="induccion-tour__text">{paso.texto}</p>
      </div>

      <div className="induccion-tour__actions">
        {!esUltimo && !esEstiloIntro && (
          <button type="button" className="induccion-tour__btn induccion-tour__btn--ghost" onClick={handleSaltar}>
            Saltar
          </button>
        )}
        <div className="induccion-tour__actions-main">
          {!esPrimero && (
            <button type="button" className="induccion-tour__btn induccion-tour__btn--secondary" onClick={onAnterior}>
              Anterior
            </button>
          )}
          <button
            type="button"
            className="induccion-tour__btn induccion-tour__btn--primary"
            onClick={esUltimo ? onCerrar : onSiguiente}
          >
            {esUltimo ? "Empezar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderIntroPantalla = () => (
    <ModalPortal>
      <div
        className={`induccion-bienvenida induccion-bienvenida--tour-intro${paso.introFinal ? " induccion-bienvenida--tour-final" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="induccion-tour-title"
      >
        <div className="induccion-bienvenida__bg" aria-hidden="true">
          <div className="induccion-bienvenida__gradient" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--1" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--2" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--3" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--4" />
          <div className="induccion-bienvenida__grain" />
        </div>

        <div className="induccion-bienvenida__panel induccion-tour-intro__panel">
          <div className="induccion-tour-intro__head">
            <span className="induccion-tour-intro__badge">{pasoIndex + 1}/{total}</span>
            <button type="button" className="induccion-tour-intro__close" onClick={handleSaltar} aria-label="Cerrar inducción">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="induccion-tour-intro__content">
            <h2 id="induccion-tour-title" className={`induccion-bienvenida__title induccion-bienvenida__title--center${paso.introFinal ? " induccion-bienvenida__title--hero" : ""}`}>
              {paso.titulo}
            </h2>
            <p className={`induccion-bienvenida__linea-video induccion-tour-intro__texto${paso.introFinal ? " induccion-bienvenida__linea-video--cierre" : ""}`}>
              {(paso.texto || "").split("\n").map((linea, i, arr) => (
                <span key={i}>{linea}{i < arr.length - 1 ? <br /> : null}</span>
              ))}
            </p>
          </div>

          <div className="induccion-tour-intro__actions">
            {!esUltimo && !paso.introFinal && (
              <button type="button" className="induccion-bienvenida__btn-ghost" onClick={handleSaltar}>
                Saltar
              </button>
            )}
            <div className="induccion-tour-intro__actions-main">
              {!esPrimero && (
                <button type="button" className="induccion-bienvenida__btn-ghost" onClick={onAnterior}>
                  Anterior
                </button>
              )}
              <button
                type="button"
                className="induccion-bienvenida__btn-primary"
                onClick={esUltimo ? onCerrar : onSiguiente}
              >
                {esUltimo ? "Empezar" : "Siguiente"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );

  if (esEstiloIntro) {
    return renderIntroPantalla();
  }

  return (
    <ModalPortal>
      <div className="induccion-tour" role="dialog" aria-modal="true" aria-labelledby="induccion-tour-title">
        <InduccionTourShade rect={!esTarjetaCentrada ? rect : null} />
        {renderTarjeta()}
      </div>
    </ModalPortal>
  );
}

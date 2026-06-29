function obtenerViewportInduccion() {
  const vv = window.visualViewport;
  return {
    width: vv?.width || window.innerWidth,
    height: vv?.height || window.innerHeight,
    offsetTop: vv?.offsetTop || 0
  };
}

function obtenerChromeInferiorPx() {
  const nav = document.querySelector(".mobile-nav-bar");
  if (nav) {
    const rect = nav.getBoundingClientRect();
    if (rect.height > 0) {
      return Math.max(0, window.innerHeight - rect.top);
    }
  }

  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;height:var(--mobile-chrome-bottom,4rem);pointer-events:none;visibility:hidden;";
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
  const tooltipRef = useRef(null);
  const litRef = useRef(null);

  const esCentro = !paso?.target || paso.placement === "center";
  const total = pasos.length;
  const esPrimero = pasoIndex === 0;
  const esUltimo = pasoIndex >= total - 1;

  const actualizarPosicion = useCallback(() => {
    const mobile = window.innerWidth < 1024;
    setEsMobile(mobile);

    if (!activo || !paso || esCentro) {
      setRect(null);
      setTooltipStyle({});
      setPointer(null);
      return;
    }

    const el = typeof encontrarElementoInduccion === "function"
      ? encontrarElementoInduccion(paso.target)
      : document.querySelector(`[data-induccion="${paso.target}"]`);

    if (!el) {
      setRect(null);
      setTooltipStyle({});
      setPointer(null);
      return;
    }

    const rawProbe = el.getBoundingClientRect();
    const chromeBottomEarly = mobile ? obtenerChromeInferiorPx() : 0;
    const targetNearBottom = mobile && rawProbe.bottom > window.innerHeight - chromeBottomEarly - 24;

    el.scrollIntoView({
      block: targetNearBottom ? "end" : (mobile ? "nearest" : "center"),
      behavior: "smooth",
      inline: "nearest"
    });

    const padding = mobile ? 4 : 6;
    const raw = el.getBoundingClientRect();
    let highlight = {
      top: Math.max(8, raw.top - padding),
      left: Math.max(8, raw.left - padding),
      width: raw.width + padding * 2,
      height: raw.height + padding * 2,
      radius: obtenerRadioHighlight(el) + 2
    };

    const viewport = obtenerViewportInduccion();
    const vh = viewport.height;
    const margin = mobile ? 10 : 10;
    const gap = mobile ? 8 : 10;
    const headerReserve = mobile ? 52 : 0;
    const maxCutoutW = viewport.width - margin * 2;
    const maxCutoutH = Math.floor(vh * (mobile ? 0.52 : 0.62));

    if (highlight.width > maxCutoutW || highlight.height > maxCutoutH) {
      const radius = highlight.radius;
      const acotar = (highlight.height > maxCutoutH && typeof acotarRectInduccionDesdeArriba === "function")
        ? acotarRectInduccionDesdeArriba
        : acotarRectInduccion;
      if (typeof acotar === "function") {
        highlight = acotar(highlight, maxCutoutW, maxCutoutH);
        highlight.radius = radius;
      }
    }

    highlight.left = Math.min(highlight.left, viewport.width - highlight.width - margin);
    highlight.top = Math.min(highlight.top, vh - highlight.height - margin);
    setRect(highlight);

    const tooltipW = mobile ? viewport.width - margin * 2 : 248;
    const tooltipH = tooltipRef.current?.offsetHeight || (mobile ? 132 : 140);
    const chromeBottom = mobile ? obtenerChromeInferiorPx() : 0;
    const dockGap = mobile ? 8 : 0;
    const placement = paso.placement || "bottom";
    const highlightBottom = highlight.top + highlight.height;
    const highlightNearBottom = highlightBottom > vh - chromeBottom - 20;
    const targetCx = highlight.left + highlight.width / 2;

    let top = 0;
    let left = 0;
    let mobileBottom = chromeBottom + dockGap;
    let nextPointer = null;

    if (mobile) {
      left = margin;
      const cardWidth = viewport.width - margin * 2;

      if (highlightNearBottom) {
        mobileBottom = Math.max(dockGap, vh - highlight.top + gap);
      } else {
        const spaceAbove = highlight.top - headerReserve - margin;
        const spaceBelow = vh - chromeBottom - dockGap - highlightBottom - gap;

        if (spaceBelow >= tooltipH + gap) {
          top = highlightBottom + gap;
          mobileBottom = null;
        } else if (spaceAbove >= tooltipH + gap) {
          top = Math.max(headerReserve + margin, highlight.top - gap - tooltipH);
          mobileBottom = null;
        } else {
          mobileBottom = chromeBottom + dockGap;
        }
      }

      if (mobileBottom != null) {
        const cardTop = vh - mobileBottom - tooltipH;
        if (cardTop < headerReserve + margin) {
          mobileBottom = Math.max(dockGap, vh - headerReserve - margin - tooltipH);
        }
      } else if (top > 0) {
        const maxTop = vh - chromeBottom - dockGap - tooltipH - gap;
        top = Math.min(top, maxTop);
        top = Math.max(headerReserve + margin, top);
      }

      const cardTop = mobileBottom != null ? vh - mobileBottom - tooltipH : top;
      const cardBottom = cardTop + tooltipH;
      const cardLeft = margin;

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

        const maxLeft = window.innerWidth - tooltipW - margin;
        l = Math.min(Math.max(margin, l), maxLeft);
        t = Math.min(Math.max(margin, t), window.innerHeight - tooltipH - margin);

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

          const cardBottom = t + tooltipH;
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
    }

    setTooltipStyle(
      mobile
        ? (mobileBottom != null
          ? { left: margin, right: margin, width: "auto", bottom: mobileBottom }
          : { left: margin, right: margin, width: "auto", top })
        : { top, left, width: tooltipW }
    );
    setPointer(nextPointer);
  }, [activo, paso, esCentro]);

  useEffect(() => {
    if (!activo || esCentro || !paso?.target) {
      if (litRef.current) {
        litRef.current.classList.remove("is-induccion-lit");
        litRef.current = null;
      }
      return undefined;
    }

    const el = typeof encontrarElementoInduccion === "function"
      ? encontrarElementoInduccion(paso.target)
      : document.querySelector(`[data-induccion="${paso.target}"]`);

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
  }, [activo, pasoIndex, paso, esCentro]);

  useLayoutEffect(() => {
    if (!activo) return undefined;
    const tick = () => requestAnimationFrame(actualizarPosicion);
    tick();
    const t1 = setTimeout(tick, 120);
    const t2 = setTimeout(tick, 420);
    window.addEventListener("resize", tick);
    window.addEventListener("scroll", tick, true);
    window.visualViewport?.addEventListener("resize", tick);
    window.visualViewport?.addEventListener("scroll", tick);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", tick);
      window.removeEventListener("scroll", tick, true);
      window.visualViewport?.removeEventListener("resize", tick);
      window.visualViewport?.removeEventListener("scroll", tick);
    };
  }, [activo, pasoIndex, actualizarPosicion]);

  useLayoutEffect(() => {
    if (!activo || !tooltipRef.current) return undefined;
    const node = tooltipRef.current;
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => requestAnimationFrame(actualizarPosicion))
      : null;
    ro?.observe(node);
    return () => ro?.disconnect();
  }, [activo, pasoIndex, actualizarPosicion]);

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

  return (
    <ModalPortal>
      <div className="induccion-tour" role="dialog" aria-modal="true" aria-labelledby="induccion-tour-title">
        {!esCentro && rect ? (
          <svg className="induccion-tour__mask" aria-hidden="true">
            <defs>
              <mask id={`induccion-cutout-${pasoIndex}`}>
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx={rect.radius}
                  ry={rect.radius}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              className="induccion-tour__mask-fill"
              mask={`url(#induccion-cutout-${pasoIndex})`}
            />
          </svg>
        ) : (
          <div className="induccion-tour__shade induccion-tour__shade--full" />
        )}

        <div
          ref={tooltipRef}
          className={[
            "induccion-tour__card",
            esCentro ? "is-centered" : "",
            esMobile && !esCentro ? "is-mobile-dock" : "",
            pointer ? `has-pointer-${pointer.side}` : ""
          ].filter(Boolean).join(" ")}
          style={{
            ...(esCentro ? undefined : tooltipStyle),
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
          <div className="induccion-tour__body">
            <p className="induccion-tour__text">{paso.texto}</p>
          </div>

          <div className="induccion-tour__actions">
            {!esUltimo && (
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
      </div>
    </ModalPortal>
  );
}

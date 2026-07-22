/**
 * Tipografías del informe embebidas (base64) para captura PDF 1:1.
 * Evita que html-to-image caiga a system-ui (texto más grande / saltos de línea).
 */
(function (global) {
  let cached = null;
  let loading = null;

  /** Expande `font-weight: 500 800` a caras discretas (mejor soporte en SVG foreignObject). */
  function expandWeightRanges(css) {
    return String(css || "").replace(/@font-face\{([^}]+)\}/g, (full, body) => {
      const wm = body.match(/font-weight:(\d+)\s+(\d+);/);
      if (!wm) return full;
      const lo = Number(wm[1]);
      const hi = Number(wm[2]);
      const base = body.replace(/font-weight:\d+\s+\d+;/, "");
      const faces = [];
      for (let w = lo; w <= hi; w += 100) {
        faces.push(`@font-face{${base}font-weight:${w};}`);
      }
      return faces.join("");
    });
  }

  async function loadInformeFontEmbedCSS() {
    if (cached) return cached;
    if (loading) return loading;
    loading = fetch("assets/fonts/informe-fonts-embed.css")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar informe-fonts-embed.css");
        return r.text();
      })
      .then((css) => {
        cached = expandWeightRanges(css);
        return cached;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  /** Congela font-size/line-height computados para que el clon SVG no los recalcule. */
  function freezeInformeTextMetrics(root) {
    const nodes = [root, ...root.querySelectorAll("*")];
    const backups = [];
    for (const el of nodes) {
      if (!(el instanceof HTMLElement)) continue;
      const cs = window.getComputedStyle(el);
      backups.push({
        el,
        fontSize: el.style.fontSize,
        fontFamily: el.style.fontFamily,
        fontWeight: el.style.fontWeight,
        fontStyle: el.style.fontStyle,
        lineHeight: el.style.lineHeight,
        letterSpacing: el.style.letterSpacing,
        wordSpacing: el.style.wordSpacing
      });
      // px absolutos = el mismo tamaño que ves en pantalla
      el.style.fontSize = cs.fontSize;
      el.style.fontFamily = '"Quicksand", system-ui, sans-serif';
      el.style.fontWeight = cs.fontWeight;
      el.style.fontStyle = cs.fontStyle;
      el.style.lineHeight = cs.lineHeight;
      el.style.letterSpacing = cs.letterSpacing;
      el.style.wordSpacing = cs.wordSpacing;
    }
    return () => {
      for (const b of backups) {
        b.el.style.fontSize = b.fontSize;
        b.el.style.fontFamily = b.fontFamily;
        b.el.style.fontWeight = b.fontWeight;
        b.el.style.fontStyle = b.fontStyle;
        b.el.style.lineHeight = b.lineHeight;
        b.el.style.letterSpacing = b.letterSpacing;
        b.el.style.wordSpacing = b.wordSpacing;
      }
    };
  }

  global.loadInformeFontEmbedCSS = loadInformeFontEmbedCSS;
  global.freezeInformeTextMetrics = freezeInformeTextMetrics;
})(window);

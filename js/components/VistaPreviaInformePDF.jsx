function InformeIconoSVG({ name = "spark", className = "" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true"
  };
  switch (name) {
    case "check":
      return (
        <svg {...common}>
          <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7.5V12l3 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M5 19V11M12 19V7M19 19v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M7 20V5M7 5h9l-1.8 2.8L16 10.5H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "lightbulb":
    case "improve":
      return (
        <svg {...common}>
          <path d="M4 15.5l5.2-5.2 3.4 3.4L20 6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14.2 6.5H20v5.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="2.6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 18.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 4l6.5 2.5v4.8c0 4-2.7 6.7-6.5 8-3.8-1.3-6.5-4-6.5-8V6.5L12 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M3.5 8.5L12 4l8.5 4.5v7L12 20l-8.5-4.5v-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 12v8M3.5 8.5L12 12l8.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "spark":
    default:
      return (
        <svg {...common}>
          <path d="M12 5l.9 3.2L16 9l-3.1.8L12 13l-.9-3.2L8 9l3.1-.8L12 5z" fill="currentColor" />
        </svg>
      );
  }
}

function SeccionTituloPDF({ title, icon = "layers", level = "h2", blockId, divider = false }) {
  const Tag = level === "h3" ? "h3" : "h2";
  const props = blockId ? { "data-block-id": blockId } : {};
  const esBadge = level === "h3";
  return (
    <div
      className={`inf-section ${esBadge ? "inf-section--badge" : ""} ${level === "h3" ? "inf-section--sub" : ""}${divider ? " inf-section--divider" : ""}`}
      {...props}
    >
      {!esBadge && (
        <span className="inf-section__ico">
          <InformeIconoSVG name={icon} />
        </span>
      )}
      <Tag className={esBadge ? "inf-h3-badge" : level === "h3" ? "inf-h3" : "inf-h2"}>
        {title}
      </Tag>
    </div>
  );
}

function BloqueEjeHeadPDF({ eje, variant = "macro" }) {
  const fechaLabel = formatearFechaEjeCorta(eje.fechaFin);
  return (
    <div className={`inf-eje inf-eje--open inf-eje--${variant} inf-eje--head`} data-eje-part="head">
      <div className="inf-eje__title-bar">
        <h4 className="inf-eje__title">{eje.titulo || "Sin título"}</h4>
        {fechaLabel && <span className="inf-eje__fecha">{fechaLabel}</span>}
      </div>
    </div>
  );
}

function BloqueEjeLeadPDF({ eje, variant = "macro" }) {
  const { intro } = parseRedactadoABloques(eje.redactado || eje.notas || "");
  const prop = Number(eje.propuestas) || 0;
  const enEjecucion = Boolean(eje.enEjecucion);
  const hechos = Number(eje.ejecutablesHechos) || 0;
  return (
    <div className={`inf-eje inf-eje--open inf-eje--cols inf-eje--${variant} inf-eje--lead`} data-eje-part="lead">
      <div className="inf-eje__body">
        <div className="inf-eje__kpi-col">
          <div className="inf-eje__kpi-item">
            <strong>{prop}</strong>
            <span>Propuestas</span>
          </div>
          <p className={`inf-eje__hechos${enEjecucion ? " inf-eje__hechos--curso" : ""}`}>
            {enEjecucion ? "En ejecución" : `${hechos} realizados`}
          </p>
        </div>
        <div className="inf-eje__text-col">
          {intro ? <p className="inf-eje__text">{intro}</p> : null}
        </div>
      </div>
    </div>
  );
}

function BloqueEjeBulletPDF({ text, isFirst, isLast }) {
  return (
    <ul
      className={`inf-eje__bullets inf-eje__bullets--split${isFirst ? " inf-eje__bullets--first" : ""}${isLast ? " inf-eje__bullets--last" : ""}`}
      data-eje-part="bullet"
    >
      <li>{text}</li>
    </ul>
  );
}

function BloqueEjePiezasPDF({ eje }) {
  const piezas = parsePiezasSeleccionadas(eje.piezas || eje.trabajos || []);
  if (!piezas.length) return null;
  return (
    <p className="inf-eje__piezas" data-eje-part="piezas">
      {piezas.map((p, i) => (
        <span key={p.nombre}>
          {i > 0 ? " · " : ""}
          {p.nombre}{p.versiones > 1 ? ` ×${p.versiones}` : ""}
        </span>
      ))}
    </p>
  );
}

/** Parte un eje en bloques empaquetables (inicio en pág.1, resto en la siguiente). */
function bloquesDeEje(eje, variant) {
  const { intro, bullets } = parseRedactadoABloques(eje.redactado || eje.notas || "");
  const piezas = parsePiezasSeleccionadas(eje.piezas || eje.trabajos || []);
  const out = [];
  out.push({ id: `${eje.id}-head`, kind: "ejeHead", eje, variant });
  out.push({ id: `${eje.id}-lead`, kind: "ejeLead", eje, variant, keepWithPrev: true });
  bullets.forEach((text, i) => {
    out.push({
      id: `${eje.id}-b${i}`,
      kind: "ejeBullet",
      eje,
      text,
      isFirst: i === 0,
      isLast: i === bullets.length - 1 && piezas.length === 0,
      variant
    });
  });
  if (piezas.length) {
    out.push({ id: `${eje.id}-piezas`, kind: "ejePiezas", eje, variant });
  }
  // Si no hay intro ni bullets, el lead aún muestra KPIs
  if (!intro && !bullets.length && !piezas.length) {
    // lead ya cubre KPIs
  }
  return out;
}

function KpiBandPDF({ totales, ejesCount }) {
  return (
    <div className="inf-kpi-band" data-block-id="kpis">
      <div className="inf-kpi-stat">
        <strong>{totales.propuestas || 0}</strong>
        <span>Propuestas</span>
      </div>
      <div className="inf-kpi-stat">
        <strong>{totales.ejecutablesHechos || 0}</strong>
        <span>Realizados</span>
      </div>
      <div className="inf-kpi-stat">
        <strong>{ejesCount || 0}</strong>
        <span>Ejes</span>
      </div>
    </div>
  );
}

function formatearFechaEjeCorta(fechaStr) {
  if (!fechaStr) return "";
  const m = String(fechaStr).match(/^(\d{4})-(\d{2})/);
  if (!m) return "";
  const meses = typeof MESES_ES !== "undefined" ? MESES_ES : [];
  const nombre = meses[Number(m[2]) - 1] || "";
  if (!nombre) return "";
  const capital = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return `${capital} ${m[1]}`;
}

function tituloInformeEnLineas(titulo) {
  const raw = String(titulo || "INFORME ENTREGABLES").trim().toUpperCase() || "INFORME ENTREGABLES";
  if (/ENTREGABLE/.test(raw)) {
    const sin = raw.replace(/\s*ENTREGABLES?\s*/i, " ").trim() || "INFORME";
    return { linea1: sin, linea2: "ENTREGABLES" };
  }
  const partes = raw.split(/\s+/);
  if (partes.length >= 2) {
    return { linea1: partes[0], linea2: partes.slice(1).join(" ") };
  }
  return { linea1: raw, linea2: "" };
}

function etiquetaCortaGrafico(label, maxLen = 16) {
  const s = String(label || "").trim();
  if (!s) return "";
  if (s.length <= maxLen) return s;
  // Cortar en espacio cuando se pueda (evita "Gamani/a", "Pricin/g")
  const slice = s.slice(0, Math.max(4, maxLen - 1));
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace >= 4 ? slice.slice(0, lastSpace) : slice.trim();
  return `${base}…`;
}

function BarrasHorizontalesPropuestas({ items }) {
  const data = items || [];
  if (!data.length) return null;
  const max = Math.max(1, ...data.map((it) => it.value || 0));
  const compact = data.length >= 5;
  const labelMax = compact ? 12 : 16;
  return (
    <div className={`inf-hbars${compact ? " inf-hbars--compact" : ""}`}>
      {data.map((it) => (
        <div key={it.label} className="inf-hbars__row">
          <span className="inf-hbars__label" title={it.label}>{etiquetaCortaGrafico(it.label, labelMax)}</span>
          <div className="inf-hbars__track">
            <div
              className="inf-hbars__fill"
              style={{ width: `${((it.value || 0) / max) * 100}%` }}
            />
          </div>
          <strong className="inf-hbars__val">{it.value || 0}</strong>
        </div>
      ))}
    </div>
  );
}

function BarrasVerticalesEjecutables({ items, altura }) {
  const data = items || [];
  if (!data.length) return null;
  const max = Math.max(1, ...data.flatMap((it) => [it.propuestos || 0, it.hechos || 0]));
  const compact = data.length >= 5;
  const h = altura != null ? altura : (compact ? Math.max(78, 118 - data.length * 4) : 112);
  const labelMax = compact ? 10 : 14;
  return (
    <div className={`inf-vbars${compact ? " inf-vbars--compact" : ""}`}>
      <div className="inf-vbars__grid" style={{ height: h }}>
        {data.map((it) => {
          const pPct = Math.max(0, Math.min(100, ((it.propuestos || 0) / max) * 100));
          const hPct = Math.max(0, Math.min(100, ((it.hechos || 0) / max) * 100));
          return (
            <div key={it.label} className="inf-vbars__col">
              <div className="inf-vbars__pair">
                <div className="inf-vbars__bar-wrap">
                  <span className="inf-vbars__val">{it.propuestos || 0}</span>
                  <div className="inf-vbars__track">
                    <div className="inf-vbars__bar inf-vbars__bar--muted" style={{ height: `${pPct}%` }} />
                  </div>
                </div>
                <div className="inf-vbars__bar-wrap">
                  <span className="inf-vbars__val">{it.hechos || 0}</span>
                  <div className="inf-vbars__track">
                    <div className="inf-vbars__bar" style={{ height: `${hPct}%` }} />
                  </div>
                </div>
              </div>
              <span className="inf-vbars__label" title={it.label}>{etiquetaCortaGrafico(it.label, labelMax)}</span>
            </div>
          );
        })}
      </div>
      <div className="inf-vbars__legend">
        <span><i className="inf-dot inf-dot--muted" /> Propuestas</span>
        <span><i className="inf-dot" /> Realizados</span>
      </div>
    </div>
  );
}

/** Dibuja el donut en canvas → PNG (html-to-image falla con SVG stroke-dasharray). */
function renderDonutPng(segments, size) {
  const data = Array.isArray(segments) ? segments : [];
  if (!data.length || typeof document === "undefined") return "";
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const soft = ["#FFFFFF", "#FFC8C8", "#FF8A8A", "#FF5C5C", "#F0F0F0"];
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size * scale);
  canvas.height = Math.round(size * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.46;
  const rInner = size * 0.28;
  const gap = data.length > 1 ? 0.035 : 0; // rad
  let angle = -Math.PI / 2;

  data.forEach((seg, i) => {
    const slice = (seg.value / total) * Math.PI * 2;
    const start = angle + gap / 2;
    const end = angle + slice - gap / 2;
    if (end > start) {
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, end, false);
      ctx.arc(cx, cy, rInner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = seg.color || soft[i % soft.length];
      ctx.fill();
    }
    angle += slice;
  });

  return canvas.toDataURL("image/png");
}

function DonutDistribucionInforme({ segments, size = 108 }) {
  const data = Array.isArray(segments) ? segments : [];
  const soft = ["#FFFFFF", "#FFC8C8", "#FF8A8A", "#FF5C5C", "#F0F0F0"];
  const fingerprint = data.map((d) => `${d.label}:${d.value}:${d.color || ""}`).join("|");
  const src = useMemo(() => renderDonutPng(data, size), [size, fingerprint]);

  if (!data.length) return null;

  return (
    <div className="inf-donut-block">
      <div className="informe-donut" style={{ width: size, height: size }}>
        {src ? (
          <img
            className="informe-donut__img"
            src={src}
            width={size}
            height={size}
            alt=""
            draggable={false}
            decoding="sync"
            style={{ display: "block", width: size, height: size }}
          />
        ) : null}
      </div>
      <ul className="inf-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span
              className="inf-legend__swatch"
              style={{ background: d.color || soft[i % soft.length] }}
            />
            <span>{d.label}</span>
            <strong>{d.pct}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function listarBloquesInforme(informe) {
  const macros = ordenarEjesPorFecha(
    (informe.macros || []).filter((e) => e.titulo || e.redactado || e.notas)
  );
  const micros = ordenarEjesPorFecha(
    (informe.micros || []).filter((e) => e.titulo || e.redactado || e.notas)
  );
  const propuestas = seriesPropuestasPorEje(informe);
  const ejecutables = seriesEjecutablesComparativa(informe);
  const dist = calcularDistribucionEntregables(informe);
  const sugerencias = informe.sugerenciasBullets || [];
  const totales = typeof totalesMetricasInforme === "function" ? totalesMetricasInforme(informe) : { propuestas: 0, ejecutablesHechos: 0 };
  const hayIndicadores = propuestas.some((p) => p.value > 0) || ejecutables.some((e) => e.propuestos > 0 || e.hechos > 0);
  const ejesCount = macros.length + micros.length;

  const blocks = [];
  blocks.push({ id: "header", kind: "header" });

  if (totales.propuestas > 0 || totales.ejecutablesHechos > 0 || ejesCount > 0) {
    blocks.push({ id: "kpis", kind: "kpis", totales, ejesCount });
  }

  if (macros.length || micros.length) {
    blocks.push({ id: "ejes-title", kind: "sectionTitle", title: "Ejes de gestión", icon: "layers" });
  }
  if (macros.length) {
    blocks.push({ id: "macro-title", kind: "subTitle", title: "Macrotemporalidades", icon: "flag" });
    macros.forEach((e) => {
      blocks.push(...bloquesDeEje(e, "macro"));
    });
  }
  if (micros.length) {
    blocks.push({ id: "micro-title", kind: "subTitle", title: "Microtemporalidades", icon: "box", divider: true });
    micros.forEach((e) => {
      blocks.push(...bloquesDeEje(e, "micro"));
    });
  }

  if (hayIndicadores) {
    const nSeries = Math.max(propuestas.length, ejecutables.length, dist.length);
    const compact = nSeries >= 4;
    blocks.push({
      id: "indicadores-title",
      kind: "sectionTitle",
      title: "Indicadores del periodo",
      icon: "chart",
      preferNewPage: true
    });
    if (propuestas.some((p) => p.value > 0)) {
      blocks.push({
        id: "indicadores-hbars",
        kind: "chartHbars",
        compact,
        propuestas
      });
    }
    if (ejecutables.some((e) => e.propuestos > 0 || e.hechos > 0)) {
      blocks.push({
        id: "indicadores-vbars",
        kind: "chartVbars",
        compact,
        ejecutables
      });
    }
    if (dist.length) {
      blocks.push({
        id: "indicadores-donut",
        kind: "chartDonut",
        compact,
        dist
      });
    }
  }

  if (sugerencias.length) {
    blocks.push({
      id: "sug-title",
      kind: "sectionTitle",
      title: "Sugerencias de mejora",
      icon: "improve",
      preferNewPage: true
    });
    sugerencias.forEach((s, i) => {
      const item = typeof normalizarSugerenciaInforme === "function"
        ? normalizarSugerenciaInforme(s)
        : s;
      if (!item) return;
      blocks.push({
        id: `sug-item-${i}`,
        kind: "sugerenciaItem",
        item,
        index: i,
        isFirst: i === 0,
        isLast: i === sugerencias.length - 1
      });
    });
  }

  return blocks;
}

function renderBloquePagina(block, informe) {
  const rango = formatearRangoMesesInforme(informe.mesDesde, informe.mesHasta);

  switch (block.kind) {
    case "header": {
      const { linea1, linea2 } = tituloInformeEnLineas(informe.titulo);
      return (
        <header key={block.id} className="inf-header" data-block-id={block.id}>
          <h1 className="inf-title">
            <span className="inf-title__line">{linea1}</span>
            {linea2 && <span className="inf-title__line">{linea2}</span>}
          </h1>
          {rango && <p className="inf-periodo">{rango}</p>}
        </header>
      );
    }
    case "kpis":
      return (
        <KpiBandPDF
          key={block.id}
          totales={block.totales}
          ejesCount={block.ejesCount}
        />
      );
    case "sectionTitle":
      return (
        <SeccionTituloPDF
          key={block.id}
          blockId={block.id}
          title={block.title}
          icon={block.icon || "layers"}
          level="h2"
        />
      );
    case "subTitle":
      return (
        <SeccionTituloPDF
          key={block.id}
          blockId={block.id}
          title={block.title}
          icon={block.icon || "flag"}
          level="h3"
          divider={!!block.divider}
        />
      );
    case "ejeHead":
      return (
        <div key={block.id} className="inf-block--eje-head" data-block-id={block.id}>
          <BloqueEjeHeadPDF eje={block.eje} variant={block.variant || "macro"} />
        </div>
      );
    case "ejeLead":
      return (
        <div key={block.id} data-block-id={block.id}>
          <BloqueEjeLeadPDF eje={block.eje} variant={block.variant || "macro"} />
        </div>
      );
    case "ejeBullet":
      return (
        <div key={block.id} data-block-id={block.id}>
          <BloqueEjeBulletPDF
            text={block.text}
            isFirst={block.isFirst}
            isLast={block.isLast}
          />
        </div>
      );
    case "ejePiezas":
      return (
        <div key={block.id} data-block-id={block.id}>
          <BloqueEjePiezasPDF eje={block.eje} />
        </div>
      );
    case "chartHbars":
      return (
        <div key={block.id} className={`inf-chart${block.compact ? " inf-chart--compact" : ""}`} data-block-id={block.id}>
          <p className="inf-chart__name">Propuestas por temporalidad</p>
          <BarrasHorizontalesPropuestas items={block.propuestas} />
        </div>
      );
    case "chartVbars":
      return (
        <div key={block.id} className={`inf-chart${block.compact ? " inf-chart--compact" : ""}`} data-block-id={block.id}>
          <p className="inf-chart__name">Propuestas vs realizados</p>
          <BarrasVerticalesEjecutables items={block.ejecutables} altura={block.compact ? 88 : 100} />
        </div>
      );
    case "chartDonut":
      return (
        <div key={block.id} className={`inf-chart inf-chart--donut${block.compact ? " inf-chart--compact" : ""}`} data-block-id={block.id}>
          <p className="inf-chart__name">Distribución</p>
          <DonutDistribucionInforme segments={block.dist} size={block.compact ? 84 : 96} />
        </div>
      );
    case "sugerencias":
      return (
        <div key={block.id} className="inf-sug-grid" data-block-id={block.id}>
          {block.items.map((s, i) => {
            const item = typeof normalizarSugerenciaInforme === "function"
              ? normalizarSugerenciaInforme(s)
              : s;
            if (!item) return null;
            return (
              <div key={`sug-${i}`} className="inf-card inf-sug__item">
                <span className="inf-sug__mark">{String(i + 1).padStart(2, "0")}</span>
                <div className="inf-sug__body">
                  {item.titulo ? <p className="inf-sug__title">{item.titulo}</p> : null}
                  <p className="inf-sug__text">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    case "sugerenciaItem": {
      const item = block.item || {};
      const n = (block.index || 0) + 1;
      return (
        <div
          key={block.id}
          className={`inf-card inf-sug__item${block.isFirst ? " inf-sug__item--first" : ""}${block.isLast ? " inf-sug__item--last" : ""}`}
          data-block-id={block.id}
        >
          <span className="inf-sug__mark">{String(n).padStart(2, "0")}</span>
          <div className="inf-sug__body">
            {item.titulo ? <p className="inf-sug__title">{item.titulo}</p> : null}
            <p className="inf-sug__text">{item.text}</p>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

function alturaPagina(page, heights, gapPx) {
  return page.reduce((acc, b, i) => acc + (heights[b.id] || 36) + (i > 0 ? gapPx : 0), 0);
}

function empaquetarPaginasPorAltura(blocks, heights, pageCapacityPx, gapPx) {
  const pages = [];
  let current = [];
  let used = 0;
  const hOf = (b) => heights[b.id] || 36;
  const isTitle = (b) => b.kind === "sectionTitle" || b.kind === "subTitle" || b.kind === "header";
  const isOrphanTitle = (b) => b && (b.kind === "sectionTitle" || b.kind === "subTitle");
  const isCoverOnly = (page) =>
    page.length > 0 && page.every((b) => b.kind === "header" || b.kind === "kpis");
  const isEjeStart = (b) => b && (b.kind === "ejeHead" || b.kind === "ejeLead");

  const flush = () => {
    if (current.length) pages.push(current);
    current = [];
    used = 0;
  };

  const pushBlock = (b) => {
    const h = hOf(b);
    const extra = current.length > 0 ? gapPx : 0;
    // keepWithPrev: título del eje no se queda solo en la página anterior
    if (b.keepWithPrev && current.length > 0 && used + extra + h > pageCapacityPx) {
      const prev = current.pop();
      flush();
      current = [prev, b];
      used = hOf(prev) + gapPx + h;
      return;
    }
    if (current.length > 0 && used + extra + h > pageCapacityPx) flush();
    used += (current.length > 0 ? gapPx : 0) + h;
    current.push(b);
  };

  const takeChunkFrom = (list) => {
    if (!list.length) return [];
    const a = list[0];
    const b = list[1];
    const c = list[2];
    // En portada: títulos + inicio del macro (head+lead)
    if (isOrphanTitle(a) && b && isOrphanTitle(b) && c && c.kind === "ejeHead") {
      const lead = list[3] && list[3].kind === "ejeLead" ? list[3] : null;
      return lead ? [a, b, c, lead] : [a, b, c];
    }
    if (isOrphanTitle(a) && b && b.kind === "ejeHead") {
      const lead = list[2] && list[2].kind === "ejeLead" ? list[2] : null;
      return lead ? [a, b, lead] : [a, b];
    }
    if (a.kind === "ejeHead" && b && b.kind === "ejeLead") return [a, b];
    if (isOrphanTitle(a) && b && isOrphanTitle(b) && c && !isTitle(c)) return [a, b, c];
    if (isOrphanTitle(a) && b && !isTitle(b)) return [a, b];
    return [a];
  };

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];

    if (block.preferNewPage && current.length > 0 && used >= pageCapacityPx * 0.4) {
      flush();
    }

    if (block.keepTogether && current.length > 0) {
      flush();
    }

    const next = blocks[i + 1];
    const onCover = isCoverOnly(current);

    // Títulos de sección + inicio de macro (head+lead) en portada
    if (
      onCover &&
      isOrphanTitle(block) &&
      next &&
      isOrphanTitle(next) &&
      blocks[i + 2] &&
      blocks[i + 2].kind === "ejeHead"
    ) {
      const lead = blocks[i + 3] && blocks[i + 3].kind === "ejeLead" ? blocks[i + 3] : null;
      const chunk = lead
        ? [block, next, blocks[i + 2], lead]
        : [block, next, blocks[i + 2]];
      const chunkH = alturaPagina(chunk, heights, gapPx);
      const extra = current.length > 0 ? gapPx : 0;
      // Si el inicio no cabe, igual lo intentamos en esta página partiendo bullets después
      if (current.length > 0 && used + extra + chunkH > pageCapacityPx) {
        // Cabe solo títulos + head? o forzar head+lead y dejar bullets para pág.2
        const mini = [block, next, blocks[i + 2], ...(lead ? [lead] : [])];
        // Empujar lo que quepa: al menos títulos + head
        pushBlock(block);
        pushBlock(next);
        pushBlock(blocks[i + 2]);
        if (lead) pushBlock(lead);
        i += lead ? 3 : 2;
        continue;
      }
      chunk.forEach((b) => pushBlock(b));
      i += lead ? 3 : 2;
      continue;
    }

    if (isOrphanTitle(block) && next && isOrphanTitle(next) && blocks[i + 2] && !isTitle(blocks[i + 2])) {
      const trioH = hOf(block) + gapPx + hOf(next) + gapPx + hOf(blocks[i + 2]);
      const extra = current.length > 0 ? gapPx : 0;
      if (current.length > 0 && used + extra + trioH > pageCapacityPx && used >= pageCapacityPx * 0.5) {
        flush();
      }
      pushBlock(block);
      pushBlock(next);
      pushBlock(blocks[i + 2]);
      i += 2;
      continue;
    }
    if (isTitle(block) && next && !isTitle(next)) {
      const pairH = hOf(block) + gapPx + hOf(next);
      const extra = current.length > 0 ? gapPx : 0;
      if (current.length > 0 && used + extra + pairH > pageCapacityPx && used >= pageCapacityPx * 0.5) {
        flush();
      }
      pushBlock(block);
      pushBlock(next);
      i += 1;
      continue;
    }
    pushBlock(block);
  }
  flush();

  for (let i = 0; i < pages.length - 1; i += 1) {
    while (pages[i].length && isOrphanTitle(pages[i][pages[i].length - 1])) {
      const t = pages[i].pop();
      pages[i + 1].unshift(t);
    }
    // No dejar ejeHead solo sin lead al final de página
    while (
      pages[i].length &&
      pages[i][pages[i].length - 1].kind === "ejeHead" &&
      pages[i + 1] &&
      pages[i + 1][0] &&
      pages[i + 1][0].kind === "ejeLead"
    ) {
      const t = pages[i].pop();
      pages[i + 1].unshift(t);
    }
    if (!pages[i].length) {
      pages.splice(i, 1);
      i -= 1;
    }
  }

  for (let i = 0; i < pages.length - 1; i += 1) {
    let moved = true;
    while (moved && pages[i + 1] && pages[i + 1].length) {
      moved = false;
      const chunk = takeChunkFrom(pages[i + 1]);
      if (chunk.some((b) => b.keepTogether || b.kind === "indicadores" || String(b.kind || "").startsWith("chart"))) break;
      if (pages[i].some((b) => b.keepTogether || b.kind === "indicadores" || String(b.kind || "").startsWith("chart"))) break;
      const nextH = alturaPagina(pages[i].concat(chunk), heights, gapPx);
      const lim = isCoverOnly(pages[i]) ? pageCapacityPx * 1.02 : pageCapacityPx;
      if (nextH <= lim) {
        pages[i] = pages[i].concat(pages[i + 1].splice(0, chunk.length));
        if (!pages[i + 1].length) pages.splice(i + 1, 1);
        moved = true;
      }
    }
  }

  // Portada solo KPIs → traer títulos + inicio del primer macro (head+lead)
  if (pages.length > 1 && isCoverOnly(pages[0])) {
    const chunk = takeChunkFrom(pages[1]);
    const nextH = alturaPagina(pages[0].concat(chunk), heights, gapPx);
    if (nextH <= pageCapacityPx * 1.02 || chunk.some(isEjeStart)) {
      // Si no cabe el chunk completo, meter al menos títulos + head (+ lead si cabe)
      if (nextH <= pageCapacityPx * 1.02) {
        pages[0] = pages[0].concat(pages[1].splice(0, chunk.length));
      } else {
        let n = 0;
        let acc = pages[0].slice();
        while (n < chunk.length) {
          const trial = acc.concat(chunk[n]);
          if (alturaPagina(trial, heights, gapPx) > pageCapacityPx * 1.02) break;
          acc = trial;
          n += 1;
        }
        if (n > 0) pages[0] = pages[0].concat(pages[1].splice(0, n));
      }
      if (!pages[1].length) pages.splice(1, 1);
    }
  }

  for (let i = pages.length - 1; i >= 1; i -= 1) {
    const page = pages[i];
    const prev = pages[i - 1];
    const pageH = alturaPagina(page, heights, gapPx);
    const prevH = alturaPagina(prev, heights, gapPx);
    const contentCount = page.filter((b) => !isTitle(b) && b.kind !== "ejeBullet").length;

    if (contentCount <= 1 && prevH + gapPx + pageH <= pageCapacityPx) {
      pages[i - 1] = prev.concat(page);
      pages.splice(i, 1);
      continue;
    }
    if (pageH < pageCapacityPx * 0.35 && prevH + gapPx + pageH <= pageCapacityPx) {
      pages[i - 1] = prev.concat(page);
      pages.splice(i, 1);
    }
  }

  return pages.length ? pages : [blocks.slice(0, 1)];
}

function VistaPreviaInformePDF({ informe, marcaAccent }) {
  const esGama = typeof marcasCoinciden === "function"
    ? marcasCoinciden(informe.marca, "Gama")
    : /gama/i.test(String(informe.marca || ""));

  const blocks = useMemo(() => listarBloquesInforme(informe), [informe]);
  const [pages, setPages] = useState(() => [blocks]);
  const measureRef = useRef(null);

  useLayoutEffect(() => {
    let cancelled = false;
    const root = measureRef.current;
    if (!root) return undefined;

    const medirYEmpaquetar = () => {
      if (cancelled || !measureRef.current) return;
      const book = measureRef.current.parentElement;
      const bookW = Math.min(400, book?.clientWidth || 400);
      // Mismo ancho útil que .informe-sheet__inner (padding lateral 8.5% + 8.5%)
      const padX = 0.085;
      const padTop = 0.32; // % del ANCHO (igual que CSS)
      const padBottom = 0.08;
      const contentW = Math.max(280, Math.round(bookW * (1 - padX * 2)));
      measureRef.current.style.width = `${contentW}px`;

      const heights = {};
      measureRef.current.querySelectorAll("[data-block-id]").forEach((node) => {
        heights[node.getAttribute("data-block-id")] =
          Math.ceil(node.getBoundingClientRect().height);
      });

      const sheetH = bookW * (1024 / 576);
      // Capacidad = alto real del body, respetando padding arriba/abajo del sheet
      const contentH = sheetH - bookW * padTop - bookW * padBottom;
      // 4% de holgura: overflow:hidden corta si nos pasamos por 1px
      const capacity = Math.max(280, Math.floor(contentH * 0.96));
      const packed = empaquetarPaginasPorAltura(blocks, heights, capacity, 5);
      if (!cancelled) setPages(packed);
    };

    // Medir con la tipografía ya cargada (si no, los altos mienten y se corta)
    const run = () => {
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
          if (!cancelled) medirYEmpaquetar();
        });
      } else {
        medirYEmpaquetar();
      }
    };
    run();
    const t = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(t);
    };
  }, [blocks, informe]);

  const hojas = pages.length ? pages : [blocks];

  return (
    <div className="informe-pdf-book" style={{ "--informe-accent": marcaAccent || "#DC2626" }}>
      <div className="informe-measure" ref={measureRef} aria-hidden="true">
        {blocks.map((b) => renderBloquePagina(b, informe))}
      </div>

      {hojas.map((pageBlocks, pageIndex) => (
        <div
          key={`sheet-${pageIndex}`}
          className={`informe-sheet ${esGama ? "informe-sheet--gama" : "informe-sheet--plain"}`}
          data-informe-page={pageIndex + 1}
        >
          {esGama && (
            <img
              className="informe-sheet__bg"
              src="assets/informe/fondo-gama.png?v=6"
              alt=""
              draggable={false}
              decoding="async"
              crossOrigin="anonymous"
            />
          )}
          <div className="informe-sheet__inner">
            <div className="informe-sheet__body">
              {pageBlocks.map((b) => renderBloquePagina(b, informe))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

window.VistaPreviaInformePDF = VistaPreviaInformePDF;
window.DonutDistribucionInforme = DonutDistribucionInforme;
window.InformeIconoSVG = InformeIconoSVG;
window.listarBloquesInforme = listarBloquesInforme;

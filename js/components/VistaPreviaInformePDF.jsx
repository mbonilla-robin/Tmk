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
    case "tag":
      return (
        <svg {...common}>
          <path d="M3.5 12V5.5H11l8 8-6.5 6.5-9-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="7.2" cy="9" r="1.1" fill="currentColor" />
        </svg>
      );
    case "hang":
      return (
        <svg {...common}>
          <path d="M12 4v7M8 9.5c0 2.2 1.8 4 4 4s4-1.8 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M7 20h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "speak":
      return (
        <svg {...common}>
          <path d="M5 7.5h10a3 3 0 013 3v2a3 3 0 01-3 3H10l-4 3v-3H5a2 2 0 01-2-2v-3a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "banner":
      return (
        <svg {...common}>
          <path d="M5 5h14v9.5l-2.2-1.4L14.5 14.5 12 13.2 9.5 14.5 7.2 13.1 5 14.5V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "floor":
      return (
        <svg {...common}>
          <path d="M4 8h16v10H4V8z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 12h16M12 8v10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "frame":
      return (
        <svg {...common}>
          <path d="M5 5h14v14H5V5z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 8h8v8H8V8z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "sticker":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9.2 12.2l1.8 1.8 3.8-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "totem":
      return (
        <svg {...common}>
          <path d="M9 20V8.5L12 4l3 4.5V20" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "wall":
      return (
        <svg {...common}>
          <path d="M4 19V8l8-4 8 4v11" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M4 11h16M12 4.2V19" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "stop":
      return (
        <svg {...common}>
          <path d="M8.2 4.5h7.6L19.5 8.2v7.6l-3.7 3.7H8.2L4.5 15.8V8.2L8.2 4.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  const esCapitulo = level !== "h3";
  return (
    <div
      className={`inf-section${esCapitulo ? " inf-section--chapter" : " inf-section--sub"}${divider ? " inf-section--divider" : ""}`}
      {...props}
    >
      {esCapitulo ? (
        <span className="inf-section__ico inf-section__ico--chapter" aria-hidden="true">
          <InformeIconoSVG name={icon} />
        </span>
      ) : null}
      <Tag className={esCapitulo ? "inf-h2" : "inf-h3"}>
        {title}
      </Tag>
    </div>
  );
}

function BloqueEjeHeadPDF({ eje, variant = "macro" }) {
  const fechaLabel = formatearFechaEjeCorta(eje.fechaFin);
  const typeIcon = variant === "micro" ? "box" : "flag";
  return (
    <div className={`inf-eje inf-eje--open inf-eje--${variant} inf-eje--head`} data-eje-part="head">
      <div className="inf-eje__title-bar">
        <span className="inf-eje__type-ico" aria-hidden="true">
          <InformeIconoSVG name={typeIcon} />
        </span>
        <h4 className="inf-eje__title">{eje.titulo || "Sin título"}</h4>
        {fechaLabel && (
          <span className="inf-eje__fecha">
            <InformeIconoSVG name="clock" />
            {fechaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function escapeRegExpInforme(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parte texto con **negrita** markdown → nodos React. */
function fragmentosMarkdownNegrita(text) {
  const raw = String(text || "");
  if (!raw) return [];
  const parts = [];
  // Soporta **negrita** (también con espacios internos)
  const re = /\*\*([^*]+?)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw))) {
    if (m.index > last) {
      parts.push({ text: raw.slice(last, m.index), weight: "plain" });
    }
    parts.push({ text: m[1], weight: "strong" });
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    parts.push({ text: raw.slice(last), weight: "plain" });
  }
  if (!parts.length) return [{ text: raw.replace(/\*\*/g, ""), weight: "plain" }];
  // Limpia asteriscos sueltos que hayan quedado
  return parts.map((p) => ({
    ...p,
    text: String(p.text || "").replace(/\*\*/g, "")
  })).filter((p) => p.text);
}

function TextoMarkdownPDF({ text, strongClass = "inf-eje__text-strong", plainClass = "" }) {
  const parts = fragmentosMarkdownNegrita(text);
  if (!parts.length) return null;
  return (
    <>
      {parts.map((p, i) => (
        p.weight === "strong" ? (
          <strong key={`md-${i}`} className={strongClass}>{p.text}</strong>
        ) : (
          <span key={`md-${i}`} className={plainClass || undefined}>{p.text}</span>
        )
      ))}
    </>
  );
}

/**
 * Fallback / enriquecimiento de **...** en el intro.
 * Prioriza el “qué se hizo” sobre el título del eje (ya visible en la barra blanca).
 */
function autoEnfasisIntroPorImportancia(intro, eje, opts = {}) {
  const skipTitle = Boolean(opts.skipTitle);
  const s = String(intro || "").trim();
  if (!s) return s;
  if (/\*\*[^*]+\*\*/.test(s) && !opts.force) return s;

  const STOP = new Set([
    "pdv", "piso", "venta", "foco", "junio", "julio", "agosto", "septiembre",
    "octubre", "noviembre", "diciembre", "enero", "febrero", "marzo", "abril", "mayo",
    "especiales", "apoyo", "materiales", "piezas", "campaña", "campana", "temporada"
  ]);

  const needles = [];
  const push = (n) => {
    let t = String(n || "").trim().replace(/\s+/g, " ");
    if (t.length < 4 || t.length > 56) return;
    if (STOP.has(t.toLowerCase())) return;
    const words = t.split(/\s+/);
    if (words.length === 1 && t.length < 7) return;
    if (!needles.some((x) => x.toLowerCase() === t.toLowerCase())) needles.push(t);
  };

  const titulo = String(eje?.titulo || "").trim();

  // Acciones / impacto (prioridad alta)
  const conceptos = s.match(
    /\b(?:despliegue integral(?: de ambientaci[oó]n)?|ambientaci[oó]n(?: e impacto visual)?|impacto visual|categor[ií]as de compra(?: clave)?|comunicaci[oó]n de precios|visibilidad(?: y tr[aá]fico)?(?: en g[oó]ndola)?|tr[aá]fico en g[oó]ndola|visibilidades exteriores|combinaci[oó]n estrat[eé]gica(?: de materiales)?|vinos exclusivos|puntas de g[oó]ndola|floor graphics?|materiales POP|revestimientos|impresos)\b/gi
  ) || [];
  conceptos.forEach(push);

  // Partners / alianzas (si no son solo el título)
  const brands = s.match(
    /\b(?:Gama(?:\s+Club)?|Gamania|Diageo|La\s+Sant[eé]|Robin|FII|Nida)\b/gi
  ) || [];
  brands.forEach((b) => {
    if (titulo && b.toLowerCase() === titulo.toLowerCase()) return;
    push(b);
  });

  const named = s.match(
    /(?:proyecto|alianza(?: estrat[eé]gica)?(?: con)?)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ]*){0,3})/gi
  ) || [];
  named.forEach((chunk) => {
    const nucleus = String(chunk || "")
      .replace(/^(?:proyecto|alianza(?: estrat[eé]gica)?(?: con)?)\s+/i, "")
      .replace(/[.,;:]+$/, "")
      .trim();
    if (nucleus.length >= 3 && (!titulo || nucleus.toLowerCase() !== titulo.toLowerCase())) {
      push(nucleus);
    }
  });

  // Título solo si no hay nada mejor (último recurso)
  if (!skipTitle && needles.length === 0 && titulo) push(titulo);

  needles.sort((a, b) => b.length - a.length);
  const top = needles.slice(0, 3);
  if (!top.length) return s;

  const re = new RegExp(`(${top.map(escapeRegExpInforme).join("|")})`, "gi");
  return s.replace(re, "**$1**");
}

/** Si la IA solo marcó el título del eje, reescribe el énfasis hacia acciones. */
function enriquecerEnfasisSiSoloTitulo(intro, eje) {
  const s = String(intro || "").trim();
  if (!s) return s;
  const titulo = String(eje?.titulo || "").trim().toLowerCase();
  const marks = [];
  s.replace(/\*\*([^*]+)\*\*/g, (_, m) => {
    marks.push(String(m || "").trim().toLowerCase());
    return _;
  });
  if (!marks.length) {
    return autoEnfasisIntroPorImportancia(s, eje, { skipTitle: true, force: true });
  }
  const soloTitulo = Boolean(titulo) && marks.every((m) => (
    m === titulo
    || titulo.includes(m)
    || m.includes(titulo)
    || m === `campaña ${titulo}`
    || m === `activación ${titulo}`
    || m === `activacion ${titulo}`
  ));
  if (!soloTitulo) return s;
  const limpio = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  return autoEnfasisIntroPorImportancia(limpio, eje, { skipTitle: true, force: true });
}

/** Parte intro en strong/light según **marcado por importancia**. */
function parseIntroConEnfasis(text, eje) {
  const raw = enriquecerEnfasisSiSoloTitulo(text, eje);
  const md = fragmentosMarkdownNegrita(raw);
  if (!md.length) return [{ text: String(raw || "").replace(/\*\*/g, ""), weight: "regular" }];
  const hasStrong = md.some((p) => p.weight === "strong");
  if (!hasStrong) {
    return [{ text: md.map((p) => p.text).join(""), weight: "regular" }];
  }
  return md.map((p) => ({
    text: p.text,
    weight: p.weight === "strong" ? "strong" : "light"
  }));
}

function IntroEjePDF({ text, eje }) {
  const parts = parseIntroConEnfasis(text, eje);
  if (!parts.length) return null;
  return (
    <p className="inf-eje__text">
      {parts.map((p, i) => (
        <span
          key={`intro-${i}`}
          className={
            p.weight === "strong"
              ? "inf-eje__text-strong"
              : p.weight === "light"
                ? "inf-eje__text-light"
                : "inf-eje__text-regular"
          }
        >
          {p.text}
        </span>
      ))}
    </p>
  );
}

function BloqueEjeLeadPDF({ eje, variant = "macro" }) {
  const { intro } = parseRedactadoABloques(eje.redactado || eje.notas || "");
  const prop = Number(eje.propuestas) || 0;
  const enEjecucion = Boolean(eje.enEjecucion);
  const hechos = Number(eje.ejecutablesHechos) || 0;
  return (
    <div className={`inf-eje inf-eje--open inf-eje--${variant} inf-eje--lead`} data-eje-part="lead">
      <div className="inf-eje__metrics">
        <div className="inf-eje__metric">
          <span className="inf-eje__metric-ico" aria-hidden="true">
            <InformeIconoSVG name="target" />
          </span>
          <div className="inf-eje__metric-copy">
            <strong>{prop}</strong>
            <span>Propuestas</span>
          </div>
        </div>
        <span className="inf-eje__metric-sep" aria-hidden="true" />
        <div className={`inf-eje__metric${enEjecucion ? " inf-eje__metric--curso" : ""}`}>
          <span className="inf-eje__metric-ico" aria-hidden="true">
            <InformeIconoSVG name={enEjecucion ? "clock" : "check"} />
          </span>
          <div className="inf-eje__metric-copy">
            <strong>{enEjecucion ? "—" : hechos}</strong>
            <span>{enEjecucion ? "En ejecución" : "Realizados"}</span>
          </div>
        </div>
      </div>
      {intro ? <IntroEjePDF text={intro} eje={eje} /> : null}
    </div>
  );
}

function BloqueEjeBulletPDF({ text, isFirst, isLast }) {
  return (
    <ul
      className={`inf-eje__bullets inf-eje__bullets--split${isFirst ? " inf-eje__bullets--first" : ""}${isLast ? " inf-eje__bullets--last" : ""}`}
      data-eje-part="bullet"
    >
      <li><TextoMarkdownPDF text={text} strongClass="inf-eje__text-strong" /></li>
    </ul>
  );
}

function BloqueEjePiezasPDF({ eje }) {
  const piezas = parsePiezasSeleccionadas(eje.piezas || eje.trabajos || []);
  if (!piezas.length) return null;
  const iconFor = typeof iconoPiezaTrade === "function"
    ? iconoPiezaTrade
    : () => "check";
  const chipsMod = piezas.length >= 5 ? "inf-eje__chips--inventory" : "inf-eje__chips--duo";
  return (
    <div className="inf-eje__piezas" data-eje-part="piezas">
      <p className="inf-eje__piezas-label">
        <InformeIconoSVG name="layers" />
        <span>Piezas</span>
      </p>
      <div className={`inf-eje__chips ${chipsMod}`}>
        {piezas.map((p) => (
          <span key={p.nombre} className="inf-eje__chip">
            <span className="inf-eje__chip-ico" aria-hidden="true">
              <InformeIconoSVG name={iconFor(p.nombre)} />
            </span>
            <span className="inf-eje__chip-name">
              {p.nombre}
              {p.versiones > 1 ? <em> ×{p.versiones}</em> : null}
            </span>
          </span>
        ))}
      </div>
    </div>
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

function CuerpoSugerenciaPDF({ text }) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const nodes = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    const key = `ub-${nodes.length}`;
    nodes.push(
      <ul key={key} className="inf-sug__bullets">
        {bullets.map((b, i) => (
          <li key={`${key}-${i}`}>
            <TextoMarkdownPDF text={b} strongClass="inf-eje__text-strong" />
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((raw) => {
    const l = String(raw || "").trim();
    if (!l) {
      flushBullets();
      return;
    }
    if (/^[•\-\*]\s+/.test(l)) {
      bullets.push(l.replace(/^[•\-\*]\s+/, ""));
      return;
    }
    if (/^\d+[.)]\s+/.test(l) && l.length < 160) {
      // Numeración corta como bullet; párrafos numerados largos van como texto
      bullets.push(l.replace(/^\d+[.)]\s+/, ""));
      return;
    }
    flushBullets();
    nodes.push(
      <p key={`p-${nodes.length}`} className="inf-sug__p">
        <TextoMarkdownPDF text={l} strongClass="inf-eje__text-strong" />
      </p>
    );
  });
  flushBullets();

  if (!nodes.length) {
    return (
      <p className="inf-sug__p">
        <TextoMarkdownPDF text={String(text || "").trim()} strongClass="inf-eje__text-strong" />
      </p>
    );
  }
  return <div className="inf-sug__rich">{nodes}</div>;
}

function ItemSugerenciaPDF({ item, index, isFirst, isLast, blockId }) {
  const n = index + 1;
  const icon = item.icon || "improve";
  return (
    <div
      className={`inf-sug__item${isFirst ? " inf-sug__item--first" : ""}${isLast ? " inf-sug__item--last" : ""}`}
      data-block-id={blockId}
    >
      <div className="inf-sug__title-bar">
        <span className="inf-sug__icon" aria-hidden="true">
          <InformeIconoSVG name={icon} />
        </span>
        <p className="inf-sug__title">{item.titulo || `Sugerencia ${n}`}</p>
        <span className="inf-sug__mark">{String(n).padStart(2, "0")}</span>
      </div>
      <div className="inf-sug__body">
        <CuerpoSugerenciaPDF text={item.text} />
      </div>
    </div>
  );
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
      divider: true,
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
      divider: true,
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
            <span className="inf-title__line inf-title__line--medium">{linea1}</span>
            {linea2 && <span className="inf-title__line inf-title__line--bold">{linea2}</span>}
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
          divider={!!block.divider}
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
              <ItemSugerenciaPDF
                key={`sug-${i}`}
                item={item}
                index={i}
                isFirst={i === 0}
                isLast={i === block.items.length - 1}
              />
            );
          })}
        </div>
      );
    case "sugerenciaItem": {
      const item = block.item || {};
      return (
        <ItemSugerenciaPDF
          key={block.id}
          blockId={block.id}
          item={item}
          index={block.index || 0}
          isFirst={block.isFirst}
          isLast={block.isLast}
        />
      );
    }
    default:
      return null;
  }
}

function alturaPagina(page, heights, gapPx) {
  return page.reduce((acc, b, i) => acc + (heights[b.id] || 36) + (i > 0 ? gapPx : 0), 0);
}

const EJE_BLOCK_KINDS = new Set(["ejeHead", "ejeLead", "ejeBullet", "ejePiezas"]);

/** Agrupa partes consecutivas del mismo eje en una ficha visual (sin caja). */
function agruparBloquesParaRender(pageBlocks) {
  const groups = [];
  let i = 0;
  const list = pageBlocks || [];
  while (i < list.length) {
    const b = list[i];
    const ejeId = b?.eje?.id;
    if (EJE_BLOCK_KINDS.has(b.kind) && ejeId) {
      const variant = b.variant || "macro";
      const chunk = [];
      while (i < list.length && EJE_BLOCK_KINDS.has(list[i].kind) && list[i].eje?.id === ejeId) {
        chunk.push(list[i]);
        i += 1;
      }
      groups.push({ type: "ejeCard", ejeId, variant, blocks: chunk });
    } else {
      groups.push({ type: "block", block: b });
      i += 1;
    }
  }
  return groups;
}

function renderGruposPagina(pageBlocks, informe) {
  return agruparBloquesParaRender(pageBlocks).map((g, idx) => {
    if (g.type === "ejeCard") {
      return (
        <div
          key={`eje-card-${g.ejeId}-${idx}`}
          className={`inf-eje-card inf-eje-card--${g.variant}`}
          data-eje-card={g.ejeId}
        >
          {g.blocks.map((b) => renderBloquePagina(b, informe))}
        </div>
      );
    }
    return renderBloquePagina(g.block, informe);
  });
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
      const lim = pageCapacityPx * 0.98;
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
    const coverLim = pageCapacityPx * 0.98;
    if (nextH <= coverLim || chunk.some(isEjeStart)) {
      // Si no cabe el chunk completo, meter al menos títulos + head (+ lead si cabe)
      if (nextH <= coverLim) {
        pages[0] = pages[0].concat(pages[1].splice(0, chunk.length));
      } else {
        let n = 0;
        let acc = pages[0].slice();
        while (n < chunk.length) {
          const trial = acc.concat(chunk[n]);
          if (alturaPagina(trial, heights, gapPx) > coverLim) break;
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
    const mergeLim = pageCapacityPx * 0.98;

    if (contentCount <= 1 && prevH + gapPx + pageH <= mergeLim) {
      pages[i - 1] = prev.concat(page);
      pages.splice(i, 1);
      continue;
    }
    if (pageH < pageCapacityPx * 0.35 && prevH + gapPx + pageH <= mergeLim) {
      pages[i - 1] = prev.concat(page);
      pages.splice(i, 1);
    }
  }

  return pages.length ? pages : [blocks.slice(0, 1)];
}

/** A4 Gama: fondo 2408×3508. Layout CSS fijo; PDF export a esos px. */
const INFORME_SHEET_DESIGN_W = 560;
const INFORME_SHEET_ASPECT_H = 3508 / 2408;
const INFORME_PDF_PAGE_W = 2408;
const INFORME_PDF_PAGE_H = 3508;

function VistaPreviaInformePDF({ informe, marcaAccent }) {
  const esGama = typeof marcasCoinciden === "function"
    ? marcasCoinciden(informe.marca, "Gama")
    : /gama/i.test(String(informe.marca || ""));

  const blocks = useMemo(() => listarBloquesInforme(informe), [informe]);
  const [pages, setPages] = useState(() => [blocks]);
  const measureRef = useRef(null);
  const bookRef = useRef(null);

  // Escala solo visual: encaja en el stage sin cambiar el layout (print preview).
  useLayoutEffect(() => {
    const book = bookRef.current;
    if (!book) return undefined;
    const stage = book.closest(".informe-preview-stage") || book.parentElement;
    if (!stage) return undefined;

    const updateScale = () => {
      const style = window.getComputedStyle(stage);
      const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const available = Math.max(120, stage.clientWidth - padX);
      const scale = Math.min(1, available / INFORME_SHEET_DESIGN_W);
      book.style.setProperty("--informe-preview-scale", String(scale));
    };

    updateScale();
    const ro = typeof ResizeObserver === "function"
      ? new ResizeObserver(updateScale)
      : null;
    if (ro) ro.observe(stage);
    window.addEventListener("resize", updateScale);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    const root = measureRef.current;
    if (!root) return undefined;

    const medirYEmpaquetar = () => {
      if (cancelled || !measureRef.current) return;
      const bookW = INFORME_SHEET_DESIGN_W;
      const padX = 0.09;
      const padTop = 0.34; // debajo del carrito/logo — no invadir esa zona
      const padBottom = 0.05;
      const contentW = Math.max(320, Math.round(bookW * (1 - padX * 2)));
      measureRef.current.style.width = `${contentW}px`;

      const heights = {};
      measureRef.current.querySelectorAll("[data-block-id]").forEach((node) => {
        heights[node.getAttribute("data-block-id")] =
          Math.ceil(node.getBoundingClientRect().height);
      });

      const sheetH = bookW * INFORME_SHEET_ASPECT_H;
      const contentH = sheetH - bookW * padTop - bookW * padBottom;
      const capacity = Math.max(320, Math.floor(contentH * 0.94));
      const packed = empaquetarPaginasPorAltura(blocks, heights, capacity, 5);
      if (!cancelled) setPages(packed);
    };

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
    <div
      className="informe-pdf-book"
      ref={bookRef}
      style={{ "--informe-accent": marcaAccent || "#DC2626" }}
      data-informe-design-w={INFORME_SHEET_DESIGN_W}
    >
      <div className="informe-measure" ref={measureRef} aria-hidden="true">
        {renderGruposPagina(blocks, informe)}
      </div>

      {hojas.map((pageBlocks, pageIndex) => (
        <div className="informe-sheet-frame" key={`frame-${pageIndex}`}>
          <div
            className={`informe-sheet ${esGama ? "informe-sheet--gama" : "informe-sheet--plain"}`}
            data-informe-page={pageIndex + 1}
          >
            {esGama && (
              <img
                className="informe-sheet__bg"
                src="assets/informe/fondo-gama-a4.png?v=1"
                alt=""
                draggable={false}
                decoding="async"
                crossOrigin="anonymous"
              />
            )}
            <div className="informe-sheet__inner">
              <div className="informe-sheet__body">
                {renderGruposPagina(pageBlocks, informe)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

window.INFORME_SHEET_DESIGN_W = INFORME_SHEET_DESIGN_W;
window.INFORME_SHEET_ASPECT_H = INFORME_SHEET_ASPECT_H;
window.INFORME_PDF_PAGE_W = INFORME_PDF_PAGE_W;
window.INFORME_PDF_PAGE_H = INFORME_PDF_PAGE_H;

window.VistaPreviaInformePDF = VistaPreviaInformePDF;
window.DonutDistribucionInforme = DonutDistribucionInforme;
window.InformeIconoSVG = InformeIconoSVG;
window.listarBloquesInforme = listarBloquesInforme;

/**
 * PDF de proyección de estatus para el cliente.
 * HTML/CSS/SVG imprimible — texto seleccionable y gráficas vectoriales.
 */
(function (global) {
  const CSS_VERSION = "13";

  function absUrl(href) {
    try {
      return new URL(href, global.location.href).href;
    } catch (_) {
      return href;
    }
  }

  function hexToRgba(hex, alpha) {
    const raw = String(hex || "").replace("#", "").trim();
    if (raw.length !== 6) return hex || "transparent";
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return hex || "transparent";
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function escapeHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function waitMs(ms) {
    return new Promise((resolve) => global.setTimeout(resolve, ms));
  }

  function waitImages(doc) {
    const imgs = Array.from(doc.querySelectorAll("img"));
    if (!imgs.length) return Promise.resolve();
    return Promise.all(imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  }

  async function waitDocumentReady(win) {
    const doc = win.document;
    await Promise.race([
      new Promise((resolve) => {
        if (doc.readyState === "complete") resolve();
        else win.addEventListener("load", resolve, { once: true });
      }),
      waitMs(2500)
    ]);
    if (doc.fonts && doc.fonts.ready) {
      await Promise.race([doc.fonts.ready, waitMs(900)]);
    }
    await Promise.race([waitImages(doc), waitMs(1500)]);
    await waitMs(350);
  }

  function cerrarVentanaExport(opts) {
    const win = opts?.win;
    if (win && !win.closed) {
      try { win.close(); } catch (_) { /* ignore */ }
    }
  }

  async function abrirPestanaImpresion(html, options) {
    const win = options.win && !options.win.closed
      ? options.win
      : global.open("about:blank", "estatus-cliente-pdf");
    if (!win) return false;

    try {
      win.document.open();
      win.document.write(html);
      win.document.close();
      await waitDocumentReady(win);
      win.focus();
    } catch (_) {
      try { win.close(); } catch (__) { /* ignore */ }
      return false;
    }
    return true;
  }

  let cssCache = null;
  async function cargarCssEstatusCliente() {
    if (cssCache) return cssCache;
    const href = absUrl(`css/estatus-cliente-pdf.css?v=${CSS_VERSION}`);
    const res = await fetch(href, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudieron cargar los estilos del PDF");
    cssCache = await res.text();
    return cssCache;
  }

  function polar(cx, cy, r, angleDeg) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function donutSlice(cx, cy, rOut, rIn, startDeg, endDeg) {
    const sweepRaw = endDeg - startDeg;
    if (sweepRaw >= 359.5) {
      return [
        donutSlice(cx, cy, rOut, rIn, startDeg, startDeg + 180),
        donutSlice(cx, cy, rOut, rIn, startDeg + 180, startDeg + 359.99)
      ].join(" ");
    }
    const sweep = Math.max(sweepRaw, 0.2);
    const large = sweep > 180 ? 1 : 0;
    const [x1, y1] = polar(cx, cy, rOut, startDeg);
    const [x2, y2] = polar(cx, cy, rOut, endDeg);
    const [x3, y3] = polar(cx, cy, rIn, endDeg);
    const [x4, y4] = polar(cx, cy, rIn, startDeg);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rOut} ${rOut} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${rIn} ${rIn} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
  }

  function svgMedidorEtapas(data) {
    const kpis = data.kpis || {};
    const colores = data.colores || {};
    const segs = [
      { id: "diseno", label: "En diseño", v: Number(kpis.diseno) || 0, c: colores.diseno || data.accent },
      { id: "enviar", label: "Próximo envío", v: Number(kpis.enviar) || 0, c: colores["por-enviar"] || "#EA580C" },
      { id: "cliente", label: "En espera de comentarios", v: Number(kpis.cliente) || 0, c: colores.cliente || "#0F766E" }
    ];
    const total = segs.reduce((sum, s) => sum + s.v, 0);
    const cx = 50;
    const cy = 50;
    const rOut = 46;
    const rIn = 30;
    let acc = 0;
    const gapBase = segs.filter((s) => s.v > 0).length > 1 ? 4 : 0;
    const paths = total === 0
      ? `<circle cx="${cx}" cy="${cy}" r="${(rOut + rIn) / 2}" fill="none" stroke="#E4E4E7" stroke-width="${rOut - rIn}" />`
      : segs.filter((s) => s.v > 0).map((s) => {
        const span = (s.v / total) * 360;
        const gap = span > 14 ? gapBase : (gapBase ? 2 : 0);
        const start = acc + gap / 2;
        const end = acc + span - gap / 2;
        acc += span;
        if (end <= start) return "";
        return `<path d="${donutSlice(cx, cy, rOut, rIn, start, end)}" fill="${escapeHtml(s.c)}" />`;
      }).join("");

    return `<div class="ec-meter">
      <div class="ec-meter-chart">
        <svg viewBox="0 0 100 100" class="ec-donut" role="img" aria-label="Distribución del trabajo">
          ${paths}
        </svg>
        <div class="ec-meter-center">
          <strong>${total}</strong>
          <span>activos</span>
        </div>
      </div>
      <ul class="ec-meter-legend">
        ${segs.map((s) => {
          const pct = total ? Math.round((s.v / total) * 100) : 0;
          return `<li>
            <span class="ec-swatch" style="background:${escapeHtml(s.c)}"></span>
            <span class="ec-meter-label">${escapeHtml(s.label)}</span>
            <strong>${s.v}</strong>
            <em>${pct}%</em>
          </li>`;
        }).join("")}
      </ul>
    </div>`;
  }

  function svgBarrasCadenas(data) {
    const cadenas = (data.cadenas || []).slice(0, 8);
    if (!cadenas.length) {
      return `<p class="ec-empty">Sin cadenas activas</p>`;
    }
    const barColor = data.accent || "#52525b";
    const max = Math.max(1, ...cadenas.map((c) => c.total || 0));
    const n = cadenas.length;
    const chartH = 132;
    const labelH = 28;
    const topPad = 16;
    const width = 420;
    const gap = n > 6 ? 6 : 10;
    const barW = Math.min(36, (width - gap * (n - 1)) / n);
    const used = barW * n + gap * (n - 1);
    const x0 = (width - used) / 2;
    const cols = cadenas.map((c, i) => {
      const x = x0 + i * (barW + gap);
      const hTotal = ((c.total || 0) / max) * chartH;
      const y = topPad + chartH - hTotal;
      const nombre = String(c.nombre || "").trim();
      const corto = nombre.length > 9 ? `${nombre.slice(0, 8)}…` : nombre;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(hTotal, 1.2).toFixed(1)}" rx="2.5" fill="${escapeHtml(barColor)}" />
        <text x="${(x + barW / 2).toFixed(1)}" y="${Math.max(10, y - 4).toFixed(1)}" text-anchor="middle" class="ec-vbar-count">${c.total}</text>
        <text x="${(x + barW / 2).toFixed(1)}" y="${topPad + chartH + 14}" text-anchor="middle" class="ec-vbar-label">${escapeHtml(corto)}</text>`;
    }).join("");

    return `<svg class="ec-vbars-svg" viewBox="0 0 ${width} ${topPad + chartH + labelH}" width="100%" role="img" aria-label="Entregables por cadena">
      ${cols}
    </svg>`;
  }

  function renderLista(grupos, emptyText) {
    const lista = grupos || [];
    if (!lista.length) {
      return `<p class="ec-empty">${escapeHtml(emptyText || "Sin entregables.")}</p>`;
    }
    const bodyRows = lista.map((grupo) => {
      const headerRow = `<tr class="ec-grupo-row"><td colspan="3">${escapeHtml(grupo.nombre)} · ${grupo.total}</td></tr>`;
      const filas = (grupo.filas || []).map((fila) => {
        const fechaClase = fila.atrasado ? " is-late" : "";
        return `<tr>
          <td class="ec-td-title">${escapeHtml(fila.entregable)}</td>
          <td class="ec-td-estado"><span class="ec-estado ec-estado--${escapeHtml(fila.etapa)}">${escapeHtml(fila.estado)}</span></td>
          <td class="ec-td-fecha${fechaClase}">${escapeHtml(fila.fecha || "TBD")}</td>
        </tr>`;
      }).join("");
      return headerRow + filas;
    }).join("");

    return `<table class="ec-master-table">
      <thead>
        <tr>
          <th>Entregable</th>
          <th>Estado</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>`;
  }

  function renderSeccionLista(titulo, total, grupos, emptyText, opts) {
    const options = opts || {};
    const extraClass = options.extraClass ? ` ${options.extraClass}` : "";
    return `<section class="ec-lista${extraClass}">
      <div class="ec-lista-head">
        <h2>${escapeHtml(titulo)}</h2>
        <span>${total}</span>
      </div>
      ${renderLista(grupos, emptyText)}
    </section>`;
  }

  function buildDocument(data, inlineCss) {
    const colores = data.colores || {};
    const logoSrc = data.logo ? absUrl(data.logo) : "";
    const yaBlanco = String(data.claveMarca || "").toUpperCase() === "DIAGEO";
    const logoHtml = logoSrc
      ? `<img class="ec-logo${yaBlanco ? " ec-logo--ya-blanco" : ""}" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(data.marca)}" />`
      : `<p class="ec-logo-text">${escapeHtml(data.marca)}</p>`;
    const total = Number(data.kpis?.total) || 0;
    const totalEspera = Number(data.kpis?.cliente) || 0;
    const totalPendientes = Number(data.kpis?.pendientes) || 0;
    const docTitle = `Estatus general TMK · ${data.marca || "Marca"}`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
${inlineCss || ""}
    :root { --ec-accent: ${escapeHtml(data.accent || "#37352F")}; }
    .ec-estado--diseno { background: ${hexToRgba(colores.diseno, 0.12)}; color: ${escapeHtml(colores.diseno)}; }
    .ec-estado--por-enviar { background: ${hexToRgba(colores["por-enviar"], 0.14)}; color: ${escapeHtml(colores["por-enviar"])}; }
    .ec-estado--cliente { background: ${hexToRgba(colores.cliente, 0.12)}; color: ${escapeHtml(colores.cliente)}; }
  </style>
</head>
<body class="ec-pdf-export">
  <div class="ec-print-bar">
    <p>PDF con <strong>texto real</strong> · al guardar, desactiva «Encabezados y pies de página».</p>
    <button type="button" class="ec-print-go" onclick="window.focus();window.print();">Guardar PDF</button>
  </div>

  <header class="ec-head">
    ${logoHtml}
    <h1>Estatus general TMK</h1>
    <p class="ec-corte">Corte al ${escapeHtml(data.corte)}</p>
  </header>

  <main class="ec-body">
    <section class="ec-dashboard">
      <div class="ec-charts">
        <article class="ec-card">
          <div class="ec-card-head">
            <h2>Dónde está el trabajo</h2>
            <p>${total} entregable${total === 1 ? "" : "s"}</p>
          </div>
          ${svgMedidorEtapas(data)}
        </article>
        <article class="ec-card">
          <div class="ec-card-head">
            <h2>Entregables por cadena</h2>
            <p>${(data.cadenas || []).length} cadena${(data.cadenas || []).length === 1 ? "" : "s"}</p>
          </div>
          ${svgBarrasCadenas(data)}
        </article>
      </div>
    </section>

    ${renderSeccionLista("En espera de comentarios", totalEspera, data.gruposEspera, "Nada en espera de comentarios.", { extraClass: "ec-lista--espera" })}

    ${renderSeccionLista("Pendientes", totalPendientes, data.gruposPendientes, "No hay entregables pendientes.", { extraClass: "ec-lista--pendientes" })}

    <footer class="ec-foot">ROBIN · Trade &amp; Shopper Marketing</footer>
  </main>
</body>
</html>`;
  }

  async function exportarEstatusClientePDF(tareas, opts) {
    const options = opts || {};
    if (typeof construirDatosEstatusCliente !== "function") {
      throw new Error("No está disponible el export de estatus");
    }
    const inlineCss = await cargarCssEstatusCliente();
    const data = construirDatosEstatusCliente(tareas, options);
    const html = buildDocument(data, inlineCss);
    const abierta = await abrirPestanaImpresion(html, options);
    if (!abierta) {
      cerrarVentanaExport(options);
      throw new Error("Permite ventanas emergentes para exportar el PDF");
    }
    if (typeof options.onDone === "function") options.onDone(true);
  }

  global.exportarEstatusClientePDF = exportarEstatusClientePDF;
})(typeof window !== "undefined" ? window : globalThis);

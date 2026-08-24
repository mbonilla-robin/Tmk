/**
 * PDF de proyección de estatus para el cliente.
 * Pestaña de impresión (Guardar como PDF) + HTML/CSS/SVG (texto y gráficas reales).
 */
(function (global) {
  const CSS_VERSION = "7";

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
      { id: "cliente", label: "En espera", v: Number(kpis.cliente) || 0, c: colores.cliente || "#0F766E" }
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
    const colores = data.colores || {};
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
      const stack = [
        { v: c.diseno || 0, c: colores.diseno },
        { v: c.enviar || 0, c: colores["por-enviar"] },
        { v: c.cliente || 0, c: colores.cliente }
      ];
      let y = topPad + chartH;
      const rects = stack.filter((s) => s.v > 0).map((s) => {
        const h = ((s.v / max) * chartH);
        y -= h;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, 1.2).toFixed(1)}" rx="2.5" fill="${escapeHtml(s.c)}" />`;
      }).join("");
      const countY = topPad + chartH - hTotal - 4;
      const nombre = String(c.nombre || "").trim();
      const corto = nombre.length > 9 ? `${nombre.slice(0, 8)}…` : nombre;
      return `${rects}
        <text x="${(x + barW / 2).toFixed(1)}" y="${Math.max(10, countY).toFixed(1)}" text-anchor="middle" class="ec-vbar-count">${c.total}</text>
        <text x="${(x + barW / 2).toFixed(1)}" y="${topPad + chartH + 14}" text-anchor="middle" class="ec-vbar-label">${escapeHtml(corto)}</text>`;
    }).join("");

    return `<svg class="ec-vbars-svg" viewBox="0 0 ${width} ${topPad + chartH + labelH}" width="100%" role="img" aria-label="Cadenas activas">
      ${cols}
    </svg>`;
  }

  function renderLista(data) {
    const grupos = data.grupos || [];
    if (!grupos.length) {
      return `<p class="ec-empty">No hay entregables pendientes.</p>`;
    }
    const bodyRows = grupos.map((grupo) => {
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

  function buildDocument(data, inlineCss) {
    const colores = data.colores || {};
    const logoSrc = data.logo ? absUrl(data.logo) : "";
    const yaBlanco = String(data.claveMarca || "").toUpperCase() === "DIAGEO";
    const logoHtml = logoSrc
      ? `<img class="ec-logo${yaBlanco ? " ec-logo--ya-blanco" : ""}" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(data.marca)}" />`
      : `<p class="ec-logo-text">${escapeHtml(data.marca)}</p>`;
    const total = Number(data.kpis?.total) || 0;
    const docTitle = `Estatus general · ${data.marca || "Marca"}`;

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
<body>
  <header class="ec-head">
    ${logoHtml}
    <h1>Estatus general</h1>
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
            <h2>Cadenas activas</h2>
            <p>${(data.cadenas || []).length} cadena${(data.cadenas || []).length === 1 ? "" : "s"}</p>
          </div>
          ${svgBarrasCadenas(data)}
        </article>
      </div>
    </section>

    <section class="ec-lista">
      <div class="ec-lista-head">
        <h2>Pendientes</h2>
        <span>${total}</span>
      </div>
      ${renderLista(data)}
    </section>

    <footer class="ec-foot">ROBIN · Trade &amp; Shopper Marketing</footer>
  </main>
</body>
</html>`;
  }

  function mostrarOverlayEstatusCliente(html, options) {
    const doc = global.document;
    const prev = doc.getElementById("estatus-cliente-print-root");
    if (prev) prev.remove();
    const root = doc.createElement("div");
    root.id = "estatus-cliente-print-root";
    root.className = "estatus-cliente-print-overlay";
    root.innerHTML = `
      <div class="estatus-cliente-print-chrome" role="dialog" aria-modal="true" aria-label="Estatus para cliente">
        <div class="estatus-cliente-print-toolbar">
          <p class="estatus-cliente-print-title">Estatus para cliente</p>
          <div class="estatus-cliente-print-actions">
            <button type="button" class="estatus-cliente-print-close">Cerrar</button>
            <button type="button" class="estatus-cliente-print-go">Imprimir / Guardar PDF</button>
          </div>
        </div>
        <iframe class="estatus-cliente-print-frame" title="Vista del estatus"></iframe>
      </div>
    `;
    doc.body.appendChild(root);
    const iframe = root.querySelector("iframe");
    const idoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
    if (idoc) {
      idoc.open();
      idoc.write(html);
      idoc.close();
    }
    let cerrado = false;
    const onKey = (event) => {
      if (event.key === "Escape") finish(false);
    };
    const finish = (ok) => {
      if (cerrado) return;
      cerrado = true;
      doc.removeEventListener("keydown", onKey);
      root.remove();
      if (typeof options.onDone === "function") options.onDone(ok);
    };
    root.querySelector(".estatus-cliente-print-close").addEventListener("click", () => finish(false));
    root.querySelector(".estatus-cliente-print-go").addEventListener("click", async () => {
      try {
        await waitDocumentReady(iframe.contentWindow);
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        global.alert(String(err?.message || "No se pudo imprimir"));
      }
    });
    root.addEventListener("click", (event) => {
      if (event.target === root) finish(false);
    });
    doc.addEventListener("keydown", onKey);
  }

  async function abrirPestanaImpresion(html, options) {
    const win = options.win && !options.win.closed
      ? options.win
      : global.open("about:blank", "estatus-cliente-pdf");
    if (!win) return false;

    let blobUrl = "";
    try {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      blobUrl = URL.createObjectURL(blob);
      await new Promise((resolve) => {
        win.addEventListener("load", resolve, { once: true });
        win.location.href = blobUrl;
        global.setTimeout(resolve, 3000);
      });
      await waitDocumentReady(win);
      win.focus();
      win.print();
    } catch (_) {
      try { win.close(); } catch (__) { /* ignore */ }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      return false;
    }
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    if (typeof options.onDone === "function") options.onDone(true);
    return true;
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
      mostrarOverlayEstatusCliente(html, options);
      if (typeof options.onDone === "function") options.onDone(true);
    }
  }

  global.exportarEstatusClientePDF = exportarEstatusClientePDF;
})(typeof window !== "undefined" ? window : globalThis);

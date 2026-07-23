/**
 * PDF con texto real vía ventana de impresión dedicada.
 * No toca la UI principal (evita “sacar de la app”) y escala el layout
 * de diseño (560×…) para llenar A4 sin deformar tipografía.
 */
(function (global) {
  const DESIGN_W = () => (typeof global.INFORME_SHEET_DESIGN_W === "number"
    ? global.INFORME_SHEET_DESIGN_W
    : 560);
  const DESIGN_H = () => Math.round(
    DESIGN_W() * (global.INFORME_SHEET_ASPECT_H || 3508 / 2408)
  );

  function absUrl(href) {
    try {
      return new URL(href, global.location.href).href;
    } catch (_) {
      return href;
    }
  }

  function waitImages(doc) {
    const imgs = Array.from(doc.querySelectorAll("img"));
    return Promise.all(imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  }

  function cloneSheetForPrint(sheet, designW, designH) {
    const clone = sheet.cloneNode(true);
    clone.classList.remove("informe-sheet--export-capture");
    clone.style.cssText = [
      `width:${designW}px`,
      `height:${designH}px`,
      "transform:none",
      "zoom:1",
      "position:relative",
      "top:auto",
      "left:auto",
      "border-radius:0",
      "box-shadow:none",
      "overflow:hidden",
      "flex-shrink:0"
    ].join(";");

    // Imágenes → URL absoluta
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src) img.setAttribute("src", absUrl(src));
    });

    // Canvas (donuts) → PNG (cloneNode no copia el bitmap)
    const srcCanvases = sheet.querySelectorAll("canvas");
    const dstCanvases = clone.querySelectorAll("canvas");
    srcCanvases.forEach((src, i) => {
      const dst = dstCanvases[i];
      if (!dst) return;
      try {
        const img = clone.ownerDocument
          ? clone.ownerDocument.createElement("img")
          : document.createElement("img");
        img.src = src.toDataURL("image/png");
        img.alt = "";
        const cs = global.getComputedStyle(src);
        img.style.width = cs.width || `${src.width}px`;
        img.style.height = cs.height || `${src.height}px`;
        img.style.display = "block";
        img.className = src.className || "";
        dst.replaceWith(img);
      } catch (_) {
        /* ignore */
      }
    });

    return clone;
  }

  function buildPrintDocument(sheets, accent) {
    const designW = DESIGN_W();
    const designH = DESIGN_H();
    // A4 @ 96dpi ≈ px; usamos eso para el scale (los mm del @page siguen siendo A4 real)
    const a4Wpx = (210 / 25.4) * 96;
    const scale = a4Wpx / designW;

    const cssLinks = [
      absUrl("css/informe-fonts.css?v=5"),
      absUrl("css/informe-entregables.css?v=104")
    ];

    const pages = Array.from(sheets).map((sheet) => {
      const clone = cloneSheetForPrint(sheet, designW, designH);
      return `<div class="print-page"><div class="print-scale">${clone.outerHTML}</div></div>`;
    }).join("\n");

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Informe entregables</title>
  ${cssLinks.map((h) => `<link rel="stylesheet" href="${h}" />`).join("\n  ")}
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-page {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      position: relative;
      background: #9d2036;
      page-break-after: always;
      break-after: page;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .print-scale {
      width: ${designW}px;
      height: ${designH}px;
      transform: scale(${scale});
      transform-origin: top left;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-scale .informe-sheet {
      width: ${designW}px !important;
      height: ${designH}px !important;
      transform: none !important;
      position: relative !important;
      top: auto !important;
      left: auto !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    .print-scale .informe-sheet__bg {
      filter: none !important;
    }
    .informe-pdf-book { --informe-accent: ${accent || "#DC2626"}; }
  </style>
</head>
<body class="informe-pdf-book" style="--informe-accent:${accent || "#DC2626"}">
${pages}
</body>
</html>`;
  }

  /**
   * @param {HTMLElement} previewRoot
   * @param {{ accent?: string, onDone?: (ok:boolean)=>void }} [opts]
   */
  async function exportarInformePDFTexto(previewRoot, opts) {
    const options = opts || {};
    const sheets = previewRoot?.querySelectorAll?.(".informe-sheet:not(.informe-sheet--ghost)");
    if (!sheets || !sheets.length) {
      throw new Error("No hay hojas para imprimir");
    }

    // Abrir YA (gesto de usuario) para no perder el popup
    const win = global.open("about:blank", "informe-pdf-texto");
    if (!win) {
      throw new Error("Permite ventanas emergentes para PDF texto");
    }

    try {
      win.document.open();
      win.document.write("<!DOCTYPE html><title>Preparando PDF…</title><body style=\"font-family:system-ui;padding:2rem\">Preparando informe…</body>");
      win.document.close();
    } catch (_) {
      /* ignore */
    }

    const html = buildPrintDocument(sheets, options.accent);
    win.document.open();
    win.document.write(html);
    win.document.close();

    if (win.document.fonts?.ready) {
      try { await win.document.fonts.ready; } catch (_) { /* ignore */ }
    }
    await waitImages(win.document);
    await new Promise((r) => global.setTimeout(r, 120));

    let finished = false;
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      try { win.removeEventListener("afterprint", onAfter); } catch (_) { /* ignore */ }
      try { win.close(); } catch (_) { /* ignore */ }
      if (typeof options.onDone === "function") options.onDone(ok);
    };

    const onAfter = () => finish(true);
    win.addEventListener("afterprint", onAfter);
    // Si cancela, afterprint suele disparar igual; si no, liberamos UI sin cerrar a la fuerza
    global.setTimeout(() => {
      if (finished) return;
      finished = true;
      try { win.removeEventListener("afterprint", onAfter); } catch (_) { /* ignore */ }
      if (typeof options.onDone === "function") options.onDone(false);
    }, 90000);

    try {
      win.focus();
      win.print();
    } catch (err) {
      finish(false);
      throw err;
    }
  }

  global.exportarInformePDFTexto = exportarInformePDFTexto;
})(typeof window !== "undefined" ? window : globalThis);

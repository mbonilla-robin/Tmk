const ROBIN_LINK_RE = /<!--\s*robin-link:([^>]+?)\s*-->/i;

function extraerMarcadorLink(text) {
  const raw = String(text || "");
  const match = raw.match(ROBIN_LINK_RE);
  if (!match) return { link: "", resto: raw };
  return {
    link: normalizarUrlEnlace(match[1].trim()),
    resto: raw.replace(ROBIN_LINK_RE, "").trim()
  };
}

function parseDetalles(detallesRaw) {
  const { link, resto } = extraerMarcadorLink(detallesRaw || "");
  const lines = resto.split("\n");
  const notasLines = [];
  const subtareas = [];
  const historial = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("• [")) {
      historial.push(trimmed);
    } else if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]") || trimmed.startsWith("* [ ]") || trimmed.startsWith("* [x]")) {
      const completed = trimmed.includes("[x]");
      const taskText = trimmed.replace(/^[-*]\s*\[[ x]\]\s*/, "");
      subtareas.push({ text: taskText, completed });
    } else if (trimmed !== "") {
      notasLines.push(line);
    }
  });

  return {
    link,
    notas: notasLines.join("\n"),
    subtareas,
    historial
  };
}

function serializeDetalles(notas, subtareas, historial, link) {
  let text = (notas || "").trim();
  if (subtareas && subtareas.length > 0) {
    const subtasksText = subtareas.map(s => `- [${s.completed ? "x" : " "}] ${s.text}`).join("\n");
    text = text ? `${text}\n\n${subtasksText}` : subtasksText;
  }
  if (historial && historial.length > 0) {
    const historialText = historial.join("\n");
    text = text ? `${text}\n\n${historialText}` : historialText;
  }
  const linkNorm = normalizarUrlEnlace(link);
  if (linkNorm) {
    text = text ? `<!--robin-link:${linkNorm}-->\n${text}` : `<!--robin-link:${linkNorm}-->`;
  }
  return text;
}

function obtenerLinkTarea(tarea) {
  if (!tarea) return "";
  if (tarea.link) return normalizarUrlEnlace(tarea.link);
  return parseDetalles(tarea.detalles || "").link || "";
}

function normalizarUrlEnlace(val) {
  let s = String(val || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}

function escaparHtmlTexto(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linkificarTextoPlano(text) {
  const escaped = escaparHtmlTexto(text);
  return escaped.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/gi,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
}

function linkificarHtmlNotas(html) {
  if (!html || typeof document === "undefined") return html || "";
  const div = document.createElement("div");
  div.innerHTML = html;
  const urlRe = /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g;
  const textNodes = [];
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((textNode) => {
    const parent = textNode.parentElement;
    if (!parent || parent.closest("a")) return;
    const text = textNode.textContent || "";
    if (!urlRe.test(text)) return;
    urlRe.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let match;
    while ((match = urlRe.exec(text)) !== null) {
      if (match.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      }
      const a = document.createElement("a");
      a.href = match[0];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = match[0];
      frag.appendChild(a);
      last = match.index + match[0].length;
    }
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    parent.replaceChild(frag, textNode);
  });

  return div.innerHTML;
}

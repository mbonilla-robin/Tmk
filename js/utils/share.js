function urlWhatsAppTexto(texto) {
  return `https://wa.me/?text=${encodeURIComponent(String(texto || ""))}`;
}

async function compartirTextoNativo(texto, titulo) {
  const body = String(texto || "").trim();
  if (!body) return { ok: false, reason: "empty" };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: titulo || "ROBIN", text: body });
      return { ok: true, method: "native" };
    } catch (err) {
      if (err && err.name === "AbortError") return { ok: false, reason: "cancelled" };
    }
  }

  return { ok: false, reason: "unsupported" };
}

function abrirWhatsAppTexto(texto) {
  const url = urlWhatsAppTexto(texto);
  window.open(url, "_blank", "noopener,noreferrer");
}

async function compartirTexto(texto, opciones) {
  const titulo = opciones?.titulo || "ROBIN";
  const nativo = await compartirTextoNativo(texto, titulo);
  if (nativo.ok) return nativo;

  abrirWhatsAppTexto(texto);
  return { ok: true, method: "whatsapp" };
}

/**
 * Cliente IA para informe de entregables (Gemini vía Edge Function).
 * La API key vive en Supabase (private.robin_app_secrets / Secrets), nunca en el browser.
 */

function informeAiBaseUrl() {
  return typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
}

function informeAiHeaders() {
  if (typeof getSupabaseRestHeaders === "function") return getSupabaseRestHeaders();
  return { "Content-Type": "application/json" };
}

function informeAiConfigured() {
  try {
    return typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
  } catch {
    return false;
  }
}

async function llamarInformeEntregablesAi(payload) {
  if (!informeAiConfigured()) {
    return { ok: false, error: "Supabase no está configurado." };
  }

  try {
    const res = await fetch(`${informeAiBaseUrl()}/functions/v1/informe-entregables-ai`, {
      method: "POST",
      headers: informeAiHeaders(),
      body: JSON.stringify(payload || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: String(data.detail || data.error || `Error ${res.status}`)
      };
    }
    return data;
  } catch (e) {
    console.warn("ROBIN: error IA informe entregables", e);
    return { ok: false, error: "No se pudo conectar con Gemini." };
  }
}

async function pingInformeGeminiAi() {
  return llamarInformeEntregablesAi({ mode: "ping" });
}

/**
 * Enriquece el informe local con redacción Gemini.
 * Si falla la IA, retorna el informe local (fallback).
 */
async function prepararInformeConGemini(informeBase) {
  // Conserva redacción IA previa; si Gemini falla no se pierde el borrador desarrollado
  const local = typeof prepararInformeParaVista === "function"
    ? prepararInformeParaVista(informeBase, { keepRedactado: true })
    : informeBase;

  const periodo = typeof formatearRangoMesesInforme === "function"
    ? formatearRangoMesesInforme(local.mesDesde, local.mesHasta)
    : "";

  const ai = await llamarInformeEntregablesAi({
    mode: "preparar_informe",
    periodo,
    informe: {
      marca: local.marca,
      macros: local.macros,
      micros: local.micros,
      sugerenciasNotas: local.sugerenciasNotas
    }
  });

  if (!ai.ok) {
    return { ok: false, informe: local, error: ai.error, source: "local" };
  }

  const mergeEjes = (locales, remotos) => {
    const byId = new Map((remotos || []).map((r) => [r.id, r]));
    const filtrar = typeof filtrarBulletsKpiDelRedactado === "function"
      ? filtrarBulletsKpiDelRedactado
      : (t) => t;
    return (locales || []).map((e) => {
      const remote = byId.get(e.id);
      if (!remote || !remote.redactado) return e;
      return { ...e, redactado: filtrar(String(remote.redactado).trim()) };
    });
  };

  const next = {
    ...local,
    macros: mergeEjes(local.macros, ai.macros),
    micros: mergeEjes(local.micros, ai.micros)
  };

  if (Array.isArray(ai.sugerenciasBullets) && ai.sugerenciasBullets.length) {
    const normalizar = typeof normalizarSugerenciaInforme === "function"
      ? normalizarSugerenciaInforme
      : (s) => s;
    const notasLen = String(local.sugerenciasNotas || "").trim().length;
    const mapped = ai.sugerenciasBullets
      .map((s) => normalizar({
        icon: s.icon || "spark",
        titulo: s.titulo || s.subtitulo || s.title || "",
        text: String(s.text || s.desarrollo || s.body || "").replace(/\\n/g, "\n").trim()
      }))
      .filter(Boolean);
    const aiLen = mapped.reduce((acc, b) => acc + String(b.text || "").length, 0);
    // Si la IA acortó de más vs las notas, preferir expansión local que conserva estructura
    if (notasLen > 180 && aiLen < notasLen * 0.85 && typeof sugerenciasABulletsIA === "function") {
      next.sugerenciasBullets = sugerenciasABulletsIA(local.sugerenciasNotas);
    } else {
      next.sugerenciasBullets = mapped;
    }
  }

  return { ok: true, informe: next, source: ai.provider === "groq" ? "groq" : "gemini" };
}

window.llamarInformeEntregablesAi = llamarInformeEntregablesAi;
window.pingInformeGeminiAi = pingInformeGeminiAi;
window.prepararInformeConGemini = prepararInformeConGemini;

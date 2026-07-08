const TMK_NEWS_CATEGORIAS = {
  general: { label: "General", tone: "general" },
  ausencia: { label: "Ausencia", tone: "ausencia" },
  aviso: { label: "Aviso", tone: "aviso" },
  robin: { label: "Robin", tone: "robin" },
  marca: { label: "Marca", tone: "marca" },
  celebracion: { label: "Celebración", tone: "celebracion" }
};

const TMK_NEWS_CARD_ART = {
  general: "fa-newspaper",
  ausencia: "fa-calendar-xmark",
  aviso: "fa-bullhorn",
  robin: "fa-feather-pointed",
  marca: "fa-tag",
  celebracion: "fa-champagne-glasses"
};

// Días que considera "Home" para mostrar las novedades.
const TMK_NEWS_DIAS_HOME = 5;

function tmkNewsSupabaseConfigured() {
  try {
    return typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
  } catch (e) {
    return false;
  }
}

function tmkNewsHeaders(prefer) {
  if (typeof getSupabaseRestHeaders === "function") {
    return getSupabaseRestHeaders(prefer);
  }
  return { "Content-Type": "application/json" };
}

function tmkNewsBaseUrl() {
  return typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
}

function normalizarUsuarioTmkNews(val) {
  return String(val || "").replace(/^@/, "").trim().toLowerCase();
}

function resolverIconoArteNoticia(category) {
  const key = String(category || "general").trim().toLowerCase();
  return TMK_NEWS_CARD_ART[key] || TMK_NEWS_CARD_ART.general;
}

function resolverEtiquetaCategoriaNoticia(category) {
  const key = String(category || "general").trim().toLowerCase();
  return TMK_NEWS_CATEGORIAS[key] || TMK_NEWS_CATEGORIAS.general;
}

function esNoticiaReciente(noticia, dias) {
  const limite = Number(dias) > 0 ? Number(dias) : TMK_NEWS_DIAS_HOME;
  const fecha = new Date(noticia?.published_at || noticia?.created_at || "");
  if (Number.isNaN(fecha.getTime())) return false;
  const desde = Date.now() - limite * 24 * 60 * 60 * 1000;
  return fecha.getTime() >= desde;
}

function noticiaEsNueva(noticia) {
  const fecha = new Date(noticia?.published_at || noticia?.created_at || "");
  if (Number.isNaN(fecha.getTime())) return false;
  return Date.now() - fecha.getTime() < 48 * 60 * 60 * 1000;
}

async function fetchNoticiasTmk({ dias = TMK_NEWS_DIAS_HOME } = {}) {
  if (!tmkNewsSupabaseConfigured()) return [];

  const limiteDias = Number(dias) > 0 ? Number(dias) : TMK_NEWS_DIAS_HOME;
  const desde = new Date(Date.now() - limiteDias * 24 * 60 * 60 * 1000).toISOString();

  try {
    const res = await fetch(
      `${tmkNewsBaseUrl()}/rest/v1/robin_news?status=eq.published&published_at=gte.${encodeURIComponent(desde)}&select=id,author_username,author_display_name,raw_input,title,lead,body,category,status,published_at,created_at&order=published_at.desc`,
      { method: "GET", headers: tmkNewsHeaders() }
    );
    if (!res.ok) {
      console.warn("ROBIN: error cargando TMK News", res.status, await res.text());
      return [];
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn("ROBIN: no se pudieron cargar noticias TMK", e);
    return [];
  }
}

async function redactarNoticiaConIA({ rawInput, authorName }) {
  const texto = String(rawInput || "").trim();
  if (!texto) return { ok: false, error: "Escribe algo para redactar." };
  if (!tmkNewsSupabaseConfigured()) {
    return { ok: false, error: "Supabase no está configurado." };
  }

  try {
    const res = await fetch(`${tmkNewsBaseUrl()}/functions/v1/tmk-news-compose`, {
      method: "POST",
      headers: tmkNewsHeaders(),
      body: JSON.stringify({
        raw_input: texto,
        author_name: String(authorName || "Un miembro del equipo").trim()
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const detalle = data.detail || data.error || `Error ${res.status}`;
      return { ok: false, error: String(detalle) };
    }

    return {
      ok: true,
      title: String(data.title || "").trim(),
      lead: String(data.lead || "").trim(),
      body: String(data.body || "").trim()
    };
  } catch (e) {
    console.warn("ROBIN: error redactando TMK News", e);
    return { ok: false, error: "No se pudo conectar con el redactor." };
  }
}

async function publicarNoticiaTmk({
  authorUsername,
  authorDisplayName,
  rawInput,
  title,
  lead,
  body,
  category = "general"
}) {
  const usuario = normalizarUsuarioTmkNews(authorUsername);
  const titulo = String(title || "").trim();
  const cuerpo = String(body || "").trim();

  if (!tmkNewsSupabaseConfigured() || !usuario || !titulo || !cuerpo) {
    return { ok: false, error: "Faltan datos para publicar." };
  }

  const cat = TMK_NEWS_CATEGORIAS[String(category || "general").toLowerCase()]
    ? String(category || "general").toLowerCase()
    : "general";

  try {
    const res = await fetch(
      `${tmkNewsBaseUrl()}/rest/v1/robin_news?select=id,author_username,author_display_name,raw_input,title,lead,body,category,status,published_at,created_at`,
      {
        method: "POST",
        headers: tmkNewsHeaders("return=representation"),
        body: JSON.stringify({
          author_username: usuario,
          author_display_name: String(authorDisplayName || usuario).trim(),
          raw_input: String(rawInput || "").trim(),
          title: titulo,
          lead: String(lead || "").trim(),
          body: cuerpo,
          category: cat,
          status: "published"
        })
      }
    );

    if (!res.ok) {
      const detalle = await res.text();
      console.warn("ROBIN: error publicando TMK News", res.status, detalle);
      return { ok: false, error: "No se pudo publicar la noticia." };
    }

    const rows = await res.json();
    const noticia = Array.isArray(rows) ? rows[0] : rows;
    if (!noticia?.id) {
      return { ok: false, error: "La noticia no se guardó correctamente." };
    }

    return { ok: true, noticia };
  } catch (e) {
    console.warn("ROBIN: error publicando TMK News", e);
    return { ok: false, error: "Error de conexión." };
  }
}

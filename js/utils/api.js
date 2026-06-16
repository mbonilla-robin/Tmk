function getEffectiveApiUrl(url) {
  if (!url) return "";
  return url.trim();
}

function getConfiguredApiUrl() {
  return getEffectiveApiUrl(typeof AUTO_API_URL !== "undefined" ? AUTO_API_URL : "");
}

function isApiConfigured() {
  const url = getConfiguredApiUrl();
  return Boolean(url && !url.includes("your_actual_url_here"));
}

async function fetchRobinApi(url, options) {
  const opts = options || {};
  const token = getRobinApiToken();
  const robinUser = getRobinApiUsername();

  if (!token || !robinUser) {
    throw new Error("Sesión requerida. Inicia sesión en ROBIN.");
  }

  const method = String(opts.method || "GET").toUpperCase();
  const baseHeaders = { ...(opts.headers || {}) };

  const useCredentials = url.indexOf("/a/macros/") >= 0 ? "include" : "same-origin";

  if (method === "GET") {
    const separator = url.indexOf("?") >= 0 ? "&" : "?";
    const targetUrl =
      `${url}${separator}token=${encodeURIComponent(token)}` +
      `&robinUser=${encodeURIComponent(robinUser)}`;
    return fetch(targetUrl, {
      ...opts,
      method: "GET",
      headers: baseHeaders,
      mode: opts.mode || "cors",
      redirect: opts.redirect || "follow",
      cache: opts.cache || "no-store",
      credentials: opts.credentials || useCredentials
    });
  }

  let body = opts.body;
  if (typeof body === "string" && body.trim()) {
    try {
      const parsed = JSON.parse(body);
      parsed.token = token;
      parsed.robinUser = robinUser;
      body = JSON.stringify(parsed);
    } catch (e) {
      body = JSON.stringify({ token, robinUser, payload: body });
    }
  } else if (!body) {
    body = JSON.stringify({ token, robinUser });
  }

  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    ...baseHeaders
  };

  return fetch(url, {
    ...opts,
    method: "POST",
    headers,
    body,
    mode: opts.mode || "cors",
    redirect: opts.redirect || "follow",
    cache: opts.cache || "no-store",
    credentials: opts.credentials || useCredentials
  });
}

function getEffectiveApiUrl(url) {
  if (!url) return "";
  let clean = url.trim();
  if (clean.includes("/a/macros/")) {
    clean = clean.replace(/\/a\/macros\/[^\/]+\/s\//, "/macros/s/");
  }
  return clean;
}

function getConfiguredApiUrl() {
  return getEffectiveApiUrl(typeof AUTO_API_URL !== "undefined" ? AUTO_API_URL : "");
}

function isApiConfigured() {
  const url = getConfiguredApiUrl();
  return Boolean(url && !url.includes("your_actual_url_here"));
}

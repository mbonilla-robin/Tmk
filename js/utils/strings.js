function stripEmoji(str) {
  if (!str) return "";
  return String(str)
    .replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .trim();
}

function cleanEstado(val) {
  if (!val) return "";
  return String(val)
    .replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cleanPrioridad(val) {
  if (!val) return "media";
  return String(val)
    .replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarPrioridad(val) {
  const clean = cleanPrioridad(val);
  if (!clean) return "Media";
  if (clean === "alta" || clean === "urgente" || clean === "high") return "Alta";
  if (clean === "baja" || clean === "low") return "Baja";
  if (clean === "media" || clean === "medium" || clean === "normal") return "Media";
  if (/\balta\b/.test(clean)) return "Alta";
  if (/\bbaja\b/.test(clean)) return "Baja";
  if (/\bmedia\b/.test(clean)) return "Media";
  return "Media";
}

function esPrioridadAlta(val) {
  return normalizarPrioridad(val) === "Alta";
}

function getPriorityWeight(priText) {
  const clean = cleanPrioridad(normalizarPrioridad(priText));
  if (clean === "alta") return 3;
  if (clean === "baja") return 1;
  return 2;
}

function cleanIdTarea(id) {
  if (!id) return "";
  const idStr = String(id).trim();
  if (idStr.includes("GMT") || (idStr.includes("2026") && idStr.length > 15) || idStr.includes("Venezuela") || idStr.startsWith("STB-")) {
    return "";
  }
  return idStr;
}

function generateBrandId(marca) {
  const prefix = String(marca || "TSK").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `STB-${prefix}-${rand}`;
}

function generarIdDeterminista(t) {
  const contentSeed = `${t.marca || "GEN"}-${t.info || ""}-${t.deadline || ""}`;
  let hash = 0;
  for (let i = 0; i < contentSeed.length; i++) {
    hash = ((hash << 5) - hash) + contentSeed.charCodeAt(i);
    hash |= 0;
  }
  const prefix = String(t.marca || "TSK").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  return `STB-${prefix}-${Math.abs(hash) % 100000}`;
}

function getTaskSelectionKey(t) {
  const id = cleanIdTarea(t.idTarea);
  if (id && isValidIdTarea(id)) return id;
  return `${t.marca || ""}|${t.info || ""}|${t.deadline || ""}`.toLowerCase().trim();
}

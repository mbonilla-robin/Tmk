function isValidIdTarea(id) {
  if (!id) return false;
  const idStr = String(id).trim().toUpperCase();
  if (idStr.length === 0) return false;
  if (idStr.includes("GMT") || idStr.includes("VENEZUELA") || idStr.includes(":")) return false;
  if (idStr === "PENDIENTE" || idStr === "EN PROGRESO" || idStr === "SEGUIMIENTO" || idStr === "EN REVISION" || idStr === "EN PAUSA" || idStr === "COMPLETADA") return false;
  return true;
}

// =========================================================================
// 🟢 COMPONENTE LOGO VECTORIAL/IMAGEN
// =========================================================================

function parseDetalles(detallesRaw) {
  const text = detallesRaw || "";
  const lines = text.split("\n");
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

  return { notas: notasLines.join("\n"), subtareas, historial };
}

function serializeDetalles(notas, subtareas, historial) {
  let text = (notas || "").trim();
  if (subtareas && subtareas.length > 0) {
    const subtasksText = subtareas.map(s => `- [${s.completed ? "x" : " "}] ${s.text}`).join("\n");
    text = text ? `${text}\n\n${subtasksText}` : subtasksText;
  }
  if (historial && historial.length > 0) {
    const historialText = historial.join("\n");
    text = text ? `${text}\n\n${historialText}` : historialText;
  }
  return text;
}

import fs from "fs";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/parse-estatus-csv.mjs <csv>");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

const raw = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(raw);
const headerIdx = rows.findIndex((r) =>
  String(r[0] || "").toUpperCase().includes("CADENA")
);
if (headerIdx < 0) {
  console.error("No header found");
  process.exit(1);
}

const data = rows.slice(headerIdx + 1);
const statuses = new Map();
const responsables = new Map();
const cadenas = new Map();
let skippedEmpty = 0;
let skippedNoEntregable = 0;
let loaded = 0;
const loadedRows = [];
const notasDeCadena = new Map();
let lastLinkByCadena = new Map();

for (const r of data) {
  const cadena = String(r[0] || "").trim();
  const entregable = String(r[1] || "").trim();
  const status = String(r[4] || "").trim();
  const responsable = String(r[5] || "").trim();
  const comentarios = String(r[7] || "").trim();
  const link = String(r[8] || "").trim();
  const hasAny = r.some((c) => String(c || "").trim());
  if (!hasAny) {
    skippedEmpty++;
    lastLinkByCadena = new Map();
    continue;
  }
  if (!cadena && !entregable) {
    skippedEmpty++;
    continue;
  }
  if (link && cadena) lastLinkByCadena.set(cadena, link);
  if (!entregable) {
    skippedNoEntregable++;
    if (cadena && (comentarios || link)) {
      const prev = notasDeCadena.get(cadena) || { comentarios: [], link: "" };
      if (comentarios) prev.comentarios.push(comentarios);
      if (link) prev.link = link;
      notasDeCadena.set(cadena, prev);
    }
    continue;
  }
  loaded++;
  const inheritedLink = link || lastLinkByCadena.get(cadena) || "";
  if (inheritedLink) lastLinkByCadena.set(cadena, inheritedLink);
  loadedRows.push({
    cadena,
    entregable,
    solicitud: String(r[2] || "").trim(),
    entrega: String(r[3] || "").trim(),
    status,
    responsable,
    detalles: String(r[6] || "").trim(),
    comentarios,
    link: inheritedLink
  });
  statuses.set(status, (statuses.get(status) || 0) + 1);
  responsables.set(responsable || "(vacío)", (responsables.get(responsable || "(vacío)") || 0) + 1);
  cadenas.set(cadena, (cadenas.get(cadena) || 0) + 1);
}

let currentCadena = "";
let currentLink = "";
for (const row of loadedRows) {
  if (row.cadena !== currentCadena) {
    currentCadena = row.cadena;
    currentLink = row.link || "";
  }
  if (row.link) currentLink = row.link;
  else if (currentLink) row.link = currentLink;
}

for (const row of loadedRows) {
  const extra = notasDeCadena.get(row.cadena);
  if (!extra) continue;
  if (!row.link && extra.link) row.link = extra.link;
  if (extra.comentarios.length && !extra.appliedComment) {
    const nota = extra.comentarios.join("\n");
    row.comentarios = row.comentarios ? `${row.comentarios}\n${nota}` : nota;
    extra.appliedComment = true;
  }
}

const out = {
  loaded,
  skippedEmpty,
  skippedNoEntregable,
  statuses: Object.fromEntries([...statuses.entries()].sort()),
  responsables: Object.fromEntries([...responsables.entries()].sort()),
  cadenas: Object.fromEntries([...cadenas.entries()].sort()),
  rows: loadedRows
};

const outPath = "scripts/estatus-la-sante-parsed.json";
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  loaded,
  skippedEmpty,
  skippedNoEntregable,
  statuses: out.statuses,
  responsables: out.responsables,
  cadenasCount: cadenas.size
}, null, 2));
console.log("wrote", outPath);

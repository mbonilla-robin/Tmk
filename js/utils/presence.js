const PRESENCE_MARCA = "Config_Marcas";
const PRESENCE_ID_PREFIX = "PRESENCE-";
const PRESENCE_ACTIVE_MS = 60000;

function presenceIdForUser(username) {
  const clean = String(username || "").replace(/^@/, "").trim().toLowerCase();
  return `${PRESENCE_ID_PREFIX}${clean}`;
}

function enviarHeartbeatPresencia(apiUrl, usuario, nombreCompleto) {
  if (!apiUrl || !usuario) return Promise.resolve();

  const username = String(usuario).replace(/^@/, "").trim();
  const payload = {
    marca: PRESENCE_MARCA,
    idTarea: presenceIdForUser(username),
    info: nombreCompleto || `@${username}`,
    detalles: String(Date.now()),
    personas: `@${username}`,
    campo: "todo"
  };

  return fetch(apiUrl, {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function extraerPresenciaDesdeDatos(data, ahoraMs) {
  if (!Array.isArray(data)) return [];

  const ahora = ahoraMs || Date.now();
  const activos = [];

  data.forEach(row => {
    const marca = String(row.marca || "").trim().toLowerCase();
    const id = String(row.idTarea || "").trim();
    if (marca !== PRESENCE_MARCA.toLowerCase()) return;
    if (!id.toUpperCase().startsWith(PRESENCE_ID_PREFIX)) return;

    const lastSeen = parseInt(String(row.detalles || "").trim(), 10);
    if (!lastSeen || (ahora - lastSeen) > PRESENCE_ACTIVE_MS) return;

    const username = String(row.personas || id.replace(PRESENCE_ID_PREFIX, "")).replace(/^@/, "").trim();
    if (!username) return;

    activos.push({
      uid: id,
      username,
      nombre: row.info || `@${username}`,
      lastSeen
    });
  });

  activos.sort((a, b) => b.lastSeen - a.lastSeen);
  return activos;
}

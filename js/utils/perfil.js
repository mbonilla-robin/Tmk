const perfilUsuarioCache = new Map();

function perfilDesdePrefs(prefs) {
  const data = prefs || {};
  const nombre = String(data.perfilNombre || "").trim();
  const apellido = String(data.perfilApellido || "").trim();
  let nombreCompleto = `${nombre} ${apellido}`.trim();
  if (!nombreCompleto) {
    nombreCompleto = String(data.nombreCompleto || "").trim();
  }

  return {
    nombre,
    apellido,
    correo: String(data.perfilCorreo || "").trim(),
    avatarUrl: String(data.perfilAvatar || "").trim(),
    nombreCompleto
  };
}

function migrarNombreCompletoAPerfil(prefs) {
  const base = { ...prefs };
  if (base.perfilNombre || base.perfilApellido) return base;

  const legacy = String(base.nombreCompleto || "").trim();
  if (!legacy) return base;

  const partes = legacy.split(/\s+/).filter(Boolean);
  if (partes.length <= 1) {
    base.perfilNombre = partes[0] || "";
    base.perfilApellido = "";
  } else {
    base.perfilApellido = partes.pop();
    base.perfilNombre = partes.join(" ");
  }
  return base;
}

function construirNombreCompletoPerfil(nombre, apellido) {
  return `${String(nombre || "").trim()} ${String(apellido || "").trim()}`.trim();
}

function invalidarCachePerfilUsuario(username) {
  const user = typeof normalizeRobinUser === "function"
    ? normalizeRobinUser(username)
    : String(username || "").replace(/^@/, "").trim().toLowerCase();
  if (user) perfilUsuarioCache.delete(user);
}

async function comprimirImagenPerfil(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("Archivo no válido");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 128;
      const scale = Math.min(1, max / Math.max(img.width, img.height, 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Imagen no válida"));
    img.src = dataUrl;
  });
}

async function obtenerPerfilUsuario(username) {
  const user = typeof normalizeRobinUser === "function"
    ? normalizeRobinUser(username)
    : String(username || "").replace(/^@/, "").trim().toLowerCase();
  if (!user) return perfilDesdePrefs({});

  if (perfilUsuarioCache.has(user)) {
    return perfilUsuarioCache.get(user);
  }

  let prefs = null;
  if (typeof loadUserDataLocal === "function") {
    prefs = migrarNombreCompletoAPerfil(loadUserDataLocal(user));
  }

  const yo = typeof getRobinApiUsername === "function" ? normalizeRobinUser(getRobinApiUsername()) : "";
  if (yo !== user && typeof fetchRemoteUserSettings === "function") {
    const remote = await fetchRemoteUserSettings(user);
    if (remote && remote.prefs) {
      prefs = migrarNombreCompletoAPerfil({ ...(prefs || {}), ...remote.prefs });
    }
  }

  const perfil = perfilDesdePrefs(prefs || {});
  perfilUsuarioCache.set(user, perfil);
  return perfil;
}

async function precargarPerfilesUsuarios(handles) {
  const lista = Array.isArray(handles) ? handles : [];
  const unicos = [...new Set(lista.map((h) => (
    typeof normalizeRobinUser === "function" ? normalizeRobinUser(h) : String(h || "").replace(/^@/, "").trim().toLowerCase()
  )).filter(Boolean))];

  const mapa = {};
  await Promise.all(unicos.map(async (user) => {
    mapa[user] = await obtenerPerfilUsuario(user);
  }));
  return mapa;
}

function nombreVisiblePerfil(perfil, author) {
  const data = perfil || {};
  if (data.nombreCompleto) return data.nombreCompleto;
  if (typeof obtenerNombreAutorComentario === "function") {
    return obtenerNombreAutorComentario(author);
  }
  return formatearHandleCanonico(author);
}

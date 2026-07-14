function normalizeRobinUsername(username) {
  return String(username || "").replace(/^@/, "").trim().toLowerCase();
}

function isWorkspacePasswordValid(password) {
  return String(password || "") === ROBIN_WORKSPACE_PASSWORD;
}

function isDesignerPasswordValid(password) {
  return String(password || "") === ROBIN_DESIGNER_PASSWORD;
}

function leerListaLocalDisenadores() {
  const raw = getLocalStorageItemSafe("robin_lista_disenadores", null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Determina si el usuario actúa como diseñador.
 * - Default: lista estática `ROBIN_DESIGNER_USERNAMES`
 * - Override: opcional `disenadoresOverride` (para que React se actualice con estado)
 * - Persistencia: `robin_lista_disenadores` (local)
 */
function isRobinDesigner(username, disenadoresOverride = null) {
  const user = normalizeRobinUsername(username);
  if (!user) return false;

  if (ROBIN_DESIGNER_USERNAMES.includes(user)) return true;

  const overrideList = Array.isArray(disenadoresOverride) ? disenadoresOverride : null;
  if (overrideList) {
    const set = new Set(overrideList.map(normalizeRobinUsername).filter(Boolean));
    return set.has(user);
  }

  const localList = leerListaLocalDisenadores();
  return localList.map(normalizeRobinUsername).includes(user);
}

function leerListaLocalContenido() {
  const raw = getLocalStorageItemSafe("robin_lista_contenido", null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Determina si el usuario es de contenido (mismos permisos que ejecutivo).
 * - Default: `ROBIN_CONTENT_USERNAMES`
 * - Override / persistencia: `robin_lista_contenido`
 */
function isRobinContent(username, contenidoOverride = null) {
  const user = normalizeRobinUsername(username);
  if (!user) return false;
  if (isRobinDesigner(user)) return false;

  if (ROBIN_CONTENT_USERNAMES.includes(user)) return true;

  const overrideList = Array.isArray(contenidoOverride) ? contenidoOverride : null;
  if (overrideList) {
    const set = new Set(overrideList.map(normalizeRobinUsername).filter(Boolean));
    return set.has(user);
  }

  return leerListaLocalContenido().map(normalizeRobinUsername).includes(user);
}

function getDefaultContentUsers() {
  return (Array.isArray(ROBIN_CONTENT_USERNAMES) ? ROBIN_CONTENT_USERNAMES : []).slice();
}

function isPasswordValidForUser(username, password) {
  // El backend valida que el usuario pertenezca realmente al rol,
  // así que del lado del frontend aceptamos cualquiera de los dos secrets.
  return isWorkspacePasswordValid(password) || isDesignerPasswordValid(password);
}

function setRobinApiSession(username, password) {
  const user = normalizeRobinUsername(username);
  if (!user) return false;
  const token = String(password || "");
  try {
    sessionStorage.setItem(ROBIN_API_SESSION_USER_KEY, user);
    sessionStorage.setItem(ROBIN_API_SESSION_TOKEN_KEY, token);
    setLocalStorageItemSafe("robin_usuario_actual", user);
    setLocalStorageItemSafe(ROBIN_API_SESSION_USER_KEY, user);
    setLocalStorageItemSafe(ROBIN_API_SESSION_TOKEN_KEY, token);
    return true;
  } catch (e) {
    return false;
  }
}

function clearRobinApiSession() {
  try {
    sessionStorage.removeItem(ROBIN_API_SESSION_USER_KEY);
    sessionStorage.removeItem(ROBIN_API_SESSION_TOKEN_KEY);
  } catch (e) {}
  removeLocalStorageItemSafe("robin_usuario_actual");
  removeLocalStorageItemSafe(ROBIN_API_SESSION_USER_KEY);
  removeLocalStorageItemSafe(ROBIN_API_SESSION_TOKEN_KEY);
}

function getRobinApiToken() {
  try {
    const fromSession = sessionStorage.getItem(ROBIN_API_SESSION_TOKEN_KEY);
    if (fromSession) return fromSession;
  } catch (e) { /* ignore */ }
  return getLocalStorageItemSafe(ROBIN_API_SESSION_TOKEN_KEY, "") || "";
}

function getRobinApiUsername() {
  try {
    const fromSession = sessionStorage.getItem(ROBIN_API_SESSION_USER_KEY);
    if (fromSession) return fromSession;
  } catch (e) { /* ignore */ }
  return getLocalStorageItemSafe(ROBIN_API_SESSION_USER_KEY, "") || "";
}

function hasRobinApiSession() {
  const user = normalizeRobinUsername(getRobinApiUsername());
  const stored = normalizeRobinUsername(getInicialUsuario());
  const token = getRobinApiToken();
  return Boolean(user && token && user === stored && isPasswordValidForUser(user, token));
}

function validateLocalLogin(username, password, allowedUsers) {
  const user = normalizeRobinUsername(username);
  if (!user) {
    return { ok: false, error: "Usuario requerido." };
  }

  const isDesignerPwd = isDesignerPasswordValid(password);
  const isWorkspacePwd = isWorkspacePasswordValid(password);
  if (!isDesignerPwd && !isWorkspacePwd) {
    return { ok: false, error: "Contraseña incorrecta." };
  }

  // Permite login con contraseña de diseñador para usuarios recién añadidos
  // desde admin (el backend confirmará pertenencia en `ROBIN_DESIGNER_USERS`).
  if (isDesignerPwd) {
    return { ok: true, username: user };
  }

  // Igual que con diseñadores: la autorización final la hace el backend con
  // `ROBIN_ALLOWED_USERS`/`ROBIN_DESIGNER_USERS`.
  if (isWorkspacePwd) {
    return { ok: true, username: user };
  }

  return { ok: false, error: "Usuario no autorizado." };
}

function isRobinConfigOnlyAdmin(username) {
  return ROBIN_CONFIG_ONLY_ADMIN_USERNAMES.includes(normalizeRobinUsername(username));
}

function isRobinAdmin(username) {
  const user = normalizeRobinUsername(username);
  return ROBIN_ADMIN_USERNAMES.includes(user) || isRobinConfigOnlyAdmin(user);
}

function getDefaultAllowedUsers() {
  return [
    "fcolmenares", "ralvarez", "mbonilla", "gnebrus",
    "dsalavarria", "sgiucastro", "dsanchez",
    "admin"
  ];
}

/** Ejecutivos por defecto (sin contenido ni diseñadores). */
function getDefaultExecutiveUsers() {
  const setContent = new Set(getDefaultContentUsers().map(normalizeRobinUsername));
  const setDesigners = new Set(
    (Array.isArray(ROBIN_DESIGNER_USERNAMES) ? ROBIN_DESIGNER_USERNAMES : []).map(normalizeRobinUsername)
  );
  return getDefaultAllowedUsers().filter(
    (u) => u === "admin" || (!setContent.has(u) && !setDesigners.has(u))
  );
}

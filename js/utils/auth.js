function normalizeRobinUsername(username) {
  return String(username || "").replace(/^@/, "").trim().toLowerCase();
}

function isWorkspacePasswordValid(password) {
  return String(password || "") === ROBIN_WORKSPACE_PASSWORD;
}

function setRobinApiSession(username, password) {
  const user = normalizeRobinUsername(username);
  if (!user) return false;
  try {
    sessionStorage.setItem(ROBIN_API_SESSION_USER_KEY, user);
    sessionStorage.setItem(ROBIN_API_SESSION_TOKEN_KEY, String(password || ""));
    setLocalStorageItemSafe("robin_usuario_actual", user);
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
}

function getRobinApiToken() {
  try {
    return sessionStorage.getItem(ROBIN_API_SESSION_TOKEN_KEY) || "";
  } catch (e) {
    return "";
  }
}

function getRobinApiUsername() {
  try {
    return sessionStorage.getItem(ROBIN_API_SESSION_USER_KEY) || "";
  } catch (e) {
    return "";
  }
}

function hasRobinApiSession() {
  const user = normalizeRobinUsername(getRobinApiUsername());
  const stored = normalizeRobinUsername(getInicialUsuario());
  const token = getRobinApiToken();
  return Boolean(user && token && user === stored && isWorkspacePasswordValid(token));
}

function validateLocalLogin(username, password, allowedUsers) {
  const user = normalizeRobinUsername(username);
  if (!user) {
    return { ok: false, error: "Usuario requerido." };
  }
  if (!Array.isArray(allowedUsers) || !allowedUsers.map(normalizeRobinUsername).includes(user)) {
    return { ok: false, error: "Usuario no autorizado." };
  }
  if (!isWorkspacePasswordValid(password)) {
    return { ok: false, error: "Contraseña incorrecta." };
  }
  return { ok: true, username: user };
}

function isRobinConfigOnlyAdmin(username) {
  return ROBIN_CONFIG_ONLY_ADMIN_USERNAMES.includes(normalizeRobinUsername(username));
}

function isRobinAdmin(username) {
  const user = normalizeRobinUsername(username);
  return ROBIN_ADMIN_USERNAMES.includes(user) || isRobinConfigOnlyAdmin(user);
}

function getDefaultAllowedUsers() {
  return ["fcolmenares", "ralvarez", "dsalavarria", "mbonilla", "gnebrus", "sgiucastro", "admin"];
}

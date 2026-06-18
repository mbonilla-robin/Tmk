const PREFS_VERSION = 1;
const REMOTE_SYNC_DEBOUNCE_MS = 600;
const remoteSyncTimers = new Map();

const LEGACY_KEYS = {
  calendarioVista: "robin_pref_calendario_vista",
  vistaModo: "robin_pref_vista_modo",
  theme: "robin_theme",
  nombreCompleto: "robin_nombre_completo"
};

const DEFAULT_USER_PREFS = {
  nombreCompleto: "",
  theme: "notion",
  pwaIconVariant: "naranja",
  paginaActiva: "home",
  vistaModo: "TABLE",
  calendarioVista: "mes",
  filtroTiempo: "TODAS",
  filtroMarca: "TODAS",
  filtroEstado: "TODOS",
  filtroPrioridad: "TODAS",
  filtroPersona: "TODAS",
  searchQuery: "",
  dashboardMobileVista: "lista",
  listaAgrupacion: "estado"
};

function normalizeUsername(username) {
  return String(username || "").replace(/^@/, "").trim().toLowerCase();
}

function userDataStorageKey(username) {
  return `robin_user_data_${normalizeUsername(username)}`;
}

function safeIsSupabaseConfigured() {
  try {
    return typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
  } catch (e) {
    return false;
  }
}

function safeSupabaseRestHeaders(prefer) {
  if (typeof getSupabaseRestHeaders === "function") {
    return getSupabaseRestHeaders(prefer);
  }
  return { "Content-Type": "application/json" };
}

function prefsForRemote(prefs) {
  const copy = { ...prefs };
  delete copy._localUpdatedAt;
  return copy;
}

function safeSupabaseUrl() {
  return typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
}

function readStoredUserPrefs(username) {
  if (!username) return null;

  try {
    const raw = getLocalStorageItemSafe(userDataStorageKey(username), null);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_USER_PREFS, ...parsed };
  } catch (e) {
    console.warn("ROBIN: error leyendo preferencias locales", e);
    return null;
  }
}

function isPrefValueEmpty(key, value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function mergePrefFields(base, other) {
  const merged = { ...base };
  if (!other) return merged;

  Object.keys(DEFAULT_USER_PREFS).forEach((key) => {
    if (isPrefValueEmpty(key, merged[key]) && !isPrefValueEmpty(key, other[key])) {
      merged[key] = other[key];
    }
  });

  return merged;
}

function mergeUserPrefRecords(local, remotePrefs, remoteTime) {
  const localTime = Number(local._localUpdatedAt) || 0;
  const remoteSafe = { ...DEFAULT_USER_PREFS, ...(remotePrefs || {}) };
  const localSafe = { ...DEFAULT_USER_PREFS, ...local };

  const newerIsRemote = remoteTime >= localTime;
  const base = newerIsRemote ? remoteSafe : localSafe;
  const filler = newerIsRemote ? localSafe : remoteSafe;
  const merged = mergePrefFields(base, filler);

  merged._localUpdatedAt = Math.max(localTime, remoteTime);
  merged._v = PREFS_VERSION;
  return merged;
}

function migrateLegacyPrefs(username) {
  const prefs = { ...DEFAULT_USER_PREFS };
  let hasLegacy = false;

  const vista = getLocalStorageItemSafe(LEGACY_KEYS.vistaModo, null);
  if (vista) {
    prefs.vistaModo = vista;
    hasLegacy = true;
  }

  const cal = getLocalStorageItemSafe(LEGACY_KEYS.calendarioVista, null);
  if (cal) {
    prefs.calendarioVista = cal;
    hasLegacy = true;
  }

  const theme = getLocalStorageItemSafe(LEGACY_KEYS.theme, null);
  if (theme) {
    prefs.theme = theme;
    hasLegacy = true;
  }

  const nombre = getLocalStorageItemSafe(LEGACY_KEYS.nombreCompleto, null);
  if (nombre) {
    prefs.nombreCompleto = nombre;
    hasLegacy = true;
  }

  const record = {
    ...prefs,
    _localUpdatedAt: hasLegacy ? Date.now() : 0,
    _v: PREFS_VERSION
  };
  setLocalStorageItemSafe(userDataStorageKey(username), JSON.stringify(record));
  return record;
}

function loadUserDataLocal(username) {
  if (!username) return { ...DEFAULT_USER_PREFS };

  const stored = readStoredUserPrefs(username);
  if (stored) return stored;

  return migrateLegacyPrefs(username);
}

function loadUserData(username) {
  return loadUserDataLocal(username);
}

function saveUserDataLocal(username, partial) {
  if (!username) return;
  const current = readStoredUserPrefs(username) || { ...DEFAULT_USER_PREFS };
  const merged = {
    ...current,
    ...partial,
    _localUpdatedAt: Date.now(),
    _v: PREFS_VERSION
  };
  setLocalStorageItemSafe(userDataStorageKey(username), JSON.stringify(merged));
}

function scheduleRemoteUserSettingsSync(username, prefs) {
  const user = normalizeUsername(username);
  if (!safeIsSupabaseConfigured() || !user) return;

  const prev = remoteSyncTimers.get(user);
  if (prev) clearTimeout(prev);

  remoteSyncTimers.set(user, setTimeout(() => {
    remoteSyncTimers.delete(user);
    upsertRemoteUserSettings(user, prefs);
  }, REMOTE_SYNC_DEBOUNCE_MS));
}

function saveUserData(username, partial) {
  if (!username) return;
  saveUserDataLocal(username, partial);
  scheduleRemoteUserSettingsSync(username, loadUserDataLocal(username));
}

async function fetchRemoteUserSettings(username) {
  const user = normalizeUsername(username);
  if (!safeIsSupabaseConfigured() || !user) return null;

  try {
    const res = await fetch(
      `${safeSupabaseUrl()}/rest/v1/robin_user_settings?username=eq.${encodeURIComponent(user)}&select=prefs,updated_at`,
      {
        method: "GET",
        headers: safeSupabaseRestHeaders()
      }
    );
    if (!res.ok) return null;

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    return {
      prefs: rows[0].prefs || {},
      updatedAt: rows[0].updated_at
    };
  } catch (e) {
    console.warn("ROBIN Supabase: no se pudo leer preferencias", e);
    return null;
  }
}

async function upsertRemoteUserSettings(username, prefs) {
  const user = normalizeUsername(username);
  if (!safeIsSupabaseConfigured() || !user) return false;

  try {
    const res = await fetch(
      `${safeSupabaseUrl()}/rest/v1/robin_user_settings?on_conflict=username`,
      {
        method: "POST",
        headers: safeSupabaseRestHeaders("resolution=merge-duplicates,return=minimal"),
        body: JSON.stringify({
          username: user,
          prefs: prefsForRemote(prefs)
        })
      }
    );
    return res.ok;
  } catch (e) {
    console.warn("ROBIN Supabase: no se pudo guardar preferencias", e);
    return false;
  }
}

async function mergeAndSyncUserPrefs(username) {
  const user = normalizeUsername(username);
  if (!user) return { ...DEFAULT_USER_PREFS };

  const local = loadUserDataLocal(user);
  if (!safeIsSupabaseConfigured()) return local;

  try {
    const remote = await fetchRemoteUserSettings(user);
    if (!remote) {
      if (local.nombreCompleto || Number(local._localUpdatedAt) > 0) {
        await upsertRemoteUserSettings(user, local);
      }
      return local;
    }

    const merged = mergeUserPrefRecords(local, remote.prefs, new Date(remote.updatedAt).getTime());
    saveUserDataLocal(user, merged);

    const localTime = Number(local._localUpdatedAt) || 0;
    const remoteTime = new Date(remote.updatedAt).getTime();
    if (merged._localUpdatedAt > remoteTime || localTime > remoteTime) {
      await upsertRemoteUserSettings(user, merged);
    }

    return merged;
  } catch (e) {
    console.warn("ROBIN Supabase: fallo al sincronizar preferencias", e);
    return local;
  }
}

async function flushRemoteUserSettings(username) {
  const user = normalizeUsername(username);
  if (!user) return;

  const pending = remoteSyncTimers.get(user);
  if (pending) {
    clearTimeout(pending);
    remoteSyncTimers.delete(user);
  }

  await upsertRemoteUserSettings(user, loadUserDataLocal(user));
}

function getUserPreference(key, fallback = null, username = null) {
  const user = username || getInicialUsuario();
  if (!user) return fallback;
  const data = loadUserDataLocal(user);
  const val = data[key];
  if (val === undefined || val === null) return fallback;
  if (typeof val === "string" && val === "" && fallback !== "") return fallback;
  return val;
}

function setUserPreference(key, value, username = null) {
  const user = username || getInicialUsuario();
  if (!user) return;
  saveUserData(user, { [key]: value });
}

function getInitialUserPrefs(username) {
  if (!username) return { ...DEFAULT_USER_PREFS };
  return loadUserDataLocal(username);
}

function resolvePaginaActivaForUser(username, prefs) {
  if (username === "admin") return "configuracion";
  const pagina = prefs.paginaActiva || "home";
  if (pagina === "configuracion" && username !== "admin") return "home";
  return pagina;
}

function applyPrefsToReactState(prefs, setters, username) {
  setters.setNombreCompleto(prefs.nombreCompleto || "");
  setters.setTheme(prefs.theme || "notion");
  if (setters.setPwaIconVariant) {
    setters.setPwaIconVariant(prefs.pwaIconVariant || prefs.logoVariant || "naranja");
  }
  setters.setVistaModo(prefs.vistaModo || "TABLE");
  setters.setFiltroTiempo(prefs.filtroTiempo || "TODAS");
  setters.setFiltroMarca(prefs.filtroMarca || "TODAS");
  setters.setFiltroEstado(prefs.filtroEstado || "TODOS");
  setters.setFiltroPrioridad(prefs.filtroPrioridad || "TODAS");
  if (setters.setFiltroPersona) {
    setters.setFiltroPersona(prefs.filtroPersona || "TODAS");
  }
  setters.setSearchQuery(prefs.searchQuery || "");
  setters.setDashboardMobileVista(prefs.dashboardMobileVista || "lista");
  if (setters.setListaAgrupacion) setters.setListaAgrupacion(prefs.listaAgrupacion || "estado");
  setters.setPaginaActiva(resolvePaginaActivaForUser(username, prefs));
}

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
  perfilNombre: "",
  perfilApellido: "",
  perfilCorreo: "",
  perfilAvatar: "",
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

const PERFIL_PREF_KEYS = ["perfilNombre", "perfilApellido", "perfilCorreo", "perfilAvatar", "nombreCompleto"];

function prefsForRemote(prefs) {
  const copy = { ...prefs };
  delete copy._localUpdatedAt;
  delete copy._v;
  return copy;
}

function usuarioTienePrefsParaSubir(prefs) {
  const p = prefs || {};
  if (Number(p._localUpdatedAt) > 0) return true;
  return PERFIL_PREF_KEYS.some((key) => !isPrefValueEmpty(key, p[key]));
}

function fusionarCamposPerfil(merged, local, remote, localTime, remoteTime) {
  const resultado = { ...merged };
  PERFIL_PREF_KEYS.forEach((key) => {
    const valorLocal = local[key];
    const valorRemoto = remote[key];
    const localTiene = !isPrefValueEmpty(key, valorLocal);
    const remotoTiene = !isPrefValueEmpty(key, valorRemoto);

    if (localTiene && remotoTiene && valorLocal !== valorRemoto) {
      resultado[key] = localTime >= remoteTime ? valorLocal : valorRemoto;
      return;
    }
    if (localTiene) resultado[key] = valorLocal;
    else if (remotoTiene) resultado[key] = valorRemoto;
  });
  return resultado;
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
  const conPerfil = fusionarCamposPerfil(merged, localSafe, remoteSafe, localTime, remoteTime);

  conPerfil._localUpdatedAt = Math.max(localTime, remoteTime);
  conPerfil._v = PREFS_VERSION;
  return conPerfil;
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

  const record = migrarNombreCompletoAPerfil({
    ...prefs,
    _localUpdatedAt: hasLegacy ? Date.now() : 0,
    _v: PREFS_VERSION
  });
  setLocalStorageItemSafe(userDataStorageKey(username), JSON.stringify(record));
  return record;
}

function loadUserDataLocal(username) {
  if (!username) return { ...DEFAULT_USER_PREFS };

  const stored = readStoredUserPrefs(username);
  if (stored) return migrarNombreCompletoAPerfil(stored);

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

  remoteSyncTimers.set(user, setTimeout(async () => {
    remoteSyncTimers.delete(user);
    await upsertRemoteUserSettings(user, prefs);
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
  if (!safeIsSupabaseConfigured() || !user) {
    return { ok: false, reason: "no_supabase" };
  }

  const payload = prefsForRemote(prefs);

  try {
    let res = await fetch(
      `${safeSupabaseUrl()}/rest/v1/robin_user_settings?on_conflict=username`,
      {
        method: "POST",
        headers: safeSupabaseRestHeaders("resolution=merge-duplicates,return=minimal"),
        body: JSON.stringify({
          username: user,
          prefs: payload
        })
      }
    );

    if (!res.ok) {
      const detallePost = await res.text();
      res = await fetch(
        `${safeSupabaseUrl()}/rest/v1/robin_user_settings?username=eq.${encodeURIComponent(user)}`,
        {
          method: "PATCH",
          headers: safeSupabaseRestHeaders("return=minimal"),
          body: JSON.stringify({ prefs: payload })
        }
      );

      if (!res.ok) {
        const detallePatch = await res.text();
        console.warn("ROBIN Supabase: no se pudo guardar perfil", res.status, detallePost || detallePatch);
        return { ok: false, status: res.status, detail: detallePatch || detallePost };
      }
    }

    return { ok: true };
  } catch (e) {
    console.warn("ROBIN Supabase: error guardando perfil", e);
    return { ok: false, detail: String(e?.message || e) };
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
      if (usuarioTienePrefsParaSubir(local)) {
        await upsertRemoteUserSettings(user, local);
      }
      return local;
    }

    const merged = mergeUserPrefRecords(local, remote.prefs, new Date(remote.updatedAt).getTime());
    saveUserDataLocal(user, merged);

    const localTime = Number(local._localUpdatedAt) || 0;
    const remoteTime = new Date(remote.updatedAt).getTime();
    if (merged._localUpdatedAt > remoteTime || localTime > remoteTime || usuarioTienePrefsParaSubir(merged)) {
      await upsertRemoteUserSettings(user, merged);
    }

    if (typeof invalidarCachePerfilUsuario === "function") {
      invalidarCachePerfilUsuario(user);
    }

    return merged;
  } catch (e) {
    console.warn("ROBIN Supabase: fallo al sincronizar preferencias", e);
    return local;
  }
}

async function flushRemoteUserSettings(username) {
  const user = normalizeUsername(username);
  if (!user) return { ok: false, reason: "no_user" };

  const pending = remoteSyncTimers.get(user);
  if (pending) {
    clearTimeout(pending);
    remoteSyncTimers.delete(user);
  }

  return upsertRemoteUserSettings(user, loadUserDataLocal(user));
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

function getBootTheme() {
  try {
    const legacy = getLocalStorageItemSafe(LEGACY_KEYS.theme, null);
    if (legacy === "midnight" || legacy === "notion") return legacy;
    const user = getInicialUsuario();
    if (user) {
      const prefs = loadUserDataLocal(user);
      if (prefs.theme) return prefs.theme;
    }
  } catch (e) {
    /* ignore */
  }
  return "notion";
}

function applyPrefsToReactState(prefs, setters, username) {
  const migradas = migrarNombreCompletoAPerfil(prefs);
  const nombreCompleto = construirNombreCompletoPerfil(migradas.perfilNombre, migradas.perfilApellido)
    || migradas.nombreCompleto
    || "";

  setters.setNombreCompleto(nombreCompleto);
  if (setters.setPerfilNombre) setters.setPerfilNombre(migradas.perfilNombre || "");
  if (setters.setPerfilApellido) setters.setPerfilApellido(migradas.perfilApellido || "");
  if (setters.setPerfilCorreo) setters.setPerfilCorreo(migradas.perfilCorreo || "");
  if (setters.setPerfilAvatar) setters.setPerfilAvatar(migradas.perfilAvatar || "");
  const nextTheme = prefs.theme || "notion";
  setters.setTheme(nextTheme);
  if (typeof applyRobinDocumentTheme === "function") applyRobinDocumentTheme(nextTheme);
  setLocalStorageItemSafe(LEGACY_KEYS.theme, nextTheme);
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

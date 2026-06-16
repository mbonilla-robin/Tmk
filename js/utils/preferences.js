const ROBIN_PREFS = {
  calendarioVista: "robin_pref_calendario_vista",
  vistaModo: "robin_pref_vista_modo"
};

function getUserPreference(key, fallback = null) {
  const storageKey = ROBIN_PREFS[key] || key;
  return getLocalStorageItemSafe(storageKey, fallback);
}

function setUserPreference(key, value) {
  const storageKey = ROBIN_PREFS[key] || key;
  setLocalStorageItemSafe(storageKey, value);
}

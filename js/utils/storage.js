function getLocalStorageItemSafe(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    if (val === null || val === undefined || val === "null" || val === "undefined" || val === "") {
      return fallback;
    }
    return val;
  } catch (e) {
    return fallback;
  }
}

function setLocalStorageItemSafe(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Acceso a almacenamiento local restringido por el navegador.", e);
  }
}

function removeLocalStorageItemSafe(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Acceso a almacenamiento local restringido por el navegador.", e);
  }
}

function clearLocalStorageSafe() {
  try {
    localStorage.clear();
  } catch (e) {
    console.warn("Acceso a almacenamiento local restringido por el navegador.", e);
  }
}

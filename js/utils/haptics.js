const ROBIN_HAPTIC_PATTERNS = {
  light: [8],
  selection: [6],
  medium: [16],
  success: [10, 45, 12],
  warning: [18, 35, 18],
  error: [28, 55, 28, 55],
  threshold: [8, 32, 10],
  refresh: [14, 40, 14],
  notify: [12, 70, 14]
};

function robinHapticSoportado() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return false;
  }
  if (typeof esPlataformaPullRefresh === "function") {
    return esPlataformaPullRefresh();
  }
  if (typeof esPlataformaMobile === "function") {
    return esPlataformaMobile();
  }
  return window.matchMedia("(max-width: 1023px)").matches;
}

function robinHaptic(tipo = "light") {
  if (!robinHapticSoportado()) return false;
  const pattern = ROBIN_HAPTIC_PATTERNS[tipo] || ROBIN_HAPTIC_PATTERNS.light;
  try {
    return navigator.vibrate(pattern);
  } catch (e) {
    return false;
  }
}

function robinHapticCancelar() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(0);
    } catch (e) {
      /* noop */
    }
  }
}

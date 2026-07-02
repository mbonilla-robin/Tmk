const ROBIN_HAPTIC_PATTERNS = {
  light: [12],
  selection: [10],
  medium: [22],
  success: [16, 60, 16, 60, 16],
  warning: [24, 45, 24, 45],
  error: [35, 70, 35, 70, 35],
  threshold: [14, 45, 14, 45, 14],
  refresh: [18, 55, 18, 55],
  notify: [16, 80, 16, 80]
};

const ROBIN_HAPTIC_IOS_PULSES = {
  light: 1,
  selection: 1,
  medium: 1,
  success: 2,
  warning: 2,
  error: 3,
  threshold: 2,
  refresh: 2,
  notify: 2
};

let robinHapticSwitchRef = null;
let robinHapticAudioCtx = null;

function esIosOIpados() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function robinHapticSoportado() {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate === "function") return true;
  if (esIosOIpados()) return true;
  if (typeof esDispositivoTactil === "function" && esDispositivoTactil()) return true;
  return false;
}

function robinObtenerSwitchHaptico() {
  if (robinHapticSwitchRef && robinHapticSwitchRef.isConnected) {
    return robinHapticSwitchRef;
  }

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.setAttribute("role", "switch");
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;
  input.id = "robin-haptic-switch";
  input.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:1px",
    "height:1px",
    "opacity:0.001",
    "pointer-events:none",
    "margin:0",
    "padding:0",
    "border:0"
  ].join(";");

  document.body.appendChild(input);
  robinHapticSwitchRef = input;
  return input;
}

function robinIosHapticTick() {
  try {
    const input = robinObtenerSwitchHaptico();
    input.checked = !input.checked;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  } catch (e) {
    return false;
  }
}

function robinPosicionarSwitchHaptico(x, y) {
  const input = robinObtenerSwitchHaptico();
  const size = 48;
  input.style.top = `${Math.max(0, y - size / 2)}px`;
  input.style.left = `${Math.max(0, x - size / 2)}px`;
  input.style.width = `${size}px`;
  input.style.height = `${size}px`;
  input.style.opacity = "0.02";
  input.style.pointerEvents = "auto";
  return input;
}

function robinRestaurarSwitchHaptico() {
  if (!robinHapticSwitchRef) return;
  robinHapticSwitchRef.style.top = "0";
  robinHapticSwitchRef.style.left = "0";
  robinHapticSwitchRef.style.width = "1px";
  robinHapticSwitchRef.style.height = "1px";
  robinHapticSwitchRef.style.opacity = "0.001";
  robinHapticSwitchRef.style.pointerEvents = "none";
}

function robinIosHaptic(pulses = 1) {
  const total = Math.max(1, Math.min(pulses, 4));
  let ok = false;

  for (let i = 0; i < total; i += 1) {
    ok = robinIosHapticTick() || ok;
    if (i < total - 1) {
      /* iOS solo permite re-disparar dentro del gesto activo */
      break;
    }
  }

  return ok;
}

function robinAndroidHaptic(pattern) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return false;
  }
  try {
    navigator.vibrate(0);
    return navigator.vibrate(pattern);
  } catch (e) {
    return false;
  }
}

function robinHapticAudioFallback(tipo) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    if (!robinHapticAudioCtx) {
      robinHapticAudioCtx = new AudioCtx();
    }
    const ctx = robinHapticAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const configs = {
      light: { freq: 200, dur: 0.01, vol: 0.04 },
      selection: { freq: 210, dur: 0.008, vol: 0.035 },
      medium: { freq: 170, dur: 0.014, vol: 0.06 },
      success: { freq: 240, dur: 0.012, vol: 0.05 },
      warning: { freq: 130, dur: 0.018, vol: 0.07 },
      error: { freq: 95, dur: 0.022, vol: 0.08 },
      threshold: { freq: 150, dur: 0.016, vol: 0.07 },
      refresh: { freq: 180, dur: 0.014, vol: 0.06 },
      notify: { freq: 160, dur: 0.016, vol: 0.065 }
    };
    const cfg = configs[tipo] || configs.light;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = cfg.freq;
    gain.gain.setValueAtTime(cfg.vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + cfg.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + cfg.dur);
    return true;
  } catch (e) {
    return false;
  }
}

function robinHaptic(tipo = "light", opts = {}) {
  if (!robinHapticSoportado()) return false;

  const pattern = ROBIN_HAPTIC_PATTERNS[tipo] || ROBIN_HAPTIC_PATTERNS.light;
  const iosPulses = ROBIN_HAPTIC_IOS_PULSES[tipo] || 1;
  const x = Number(opts.x);
  const y = Number(opts.y);
  const enPunto = Number.isFinite(x) && Number.isFinite(y);

  if (enPunto && esIosOIpados()) {
    robinPosicionarSwitchHaptico(x, y);
  }

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    const ok = robinAndroidHaptic(pattern);
    if (ok !== false) {
      if (enPunto) window.setTimeout(robinRestaurarSwitchHaptico, 120);
      return true;
    }
  }

  if (esIosOIpados()) {
    if (robinIosHaptic(iosPulses)) {
      window.setTimeout(robinRestaurarSwitchHaptico, 120);
      return true;
    }
  }

  const audioOk = robinHapticAudioFallback(tipo);
  if (enPunto) window.setTimeout(robinRestaurarSwitchHaptico, 120);
  return audioOk;
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

function robinHapticInicializar() {
  if (!robinHapticSoportado()) return;

  const despertar = () => {
    if (esIosOIpados()) {
      robinObtenerSwitchHaptico();
    }
    if (robinHapticAudioCtx && robinHapticAudioCtx.state === "suspended") {
      robinHapticAudioCtx.resume().catch(() => {});
    }
  };

  document.addEventListener("touchstart", despertar, { passive: true, once: false });
  document.addEventListener("click", despertar, { passive: true, once: false });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", robinHapticInicializar);
  } else {
    robinHapticInicializar();
  }
}

const PWA_THEME_COLOR = "#FFFFFF";
const PWA_BACKGROUND_COLOR = "#FFFFFF";

const PWA_ICON_VARIANTS = {
  blanco: {
    label: "Blanco",
    preview: "icons/logo-blanco.png",
    apple: "icons/pwa-blanco-180.png",
    icon192: "icons/pwa-blanco-192.png",
    icon512: "icons/pwa-blanco-512.png"
  },
  negro: {
    label: "Negro",
    preview: "icons/logo-negro.png",
    apple: "icons/pwa-negro-180.png",
    icon192: "icons/pwa-negro-192.png",
    icon512: "icons/pwa-negro-512.png"
  },
  naranja: {
    label: "Naranja",
    preview: "icons/logo-naranja.png",
    apple: "icons/pwa-naranja-180.png",
    icon192: "icons/pwa-naranja-192.png",
    icon512: "icons/pwa-naranja-512.png"
  }
};

let pwaManifestBlobUrl = null;

function applyPwaIconVariant(variant) {
  const cfg = PWA_ICON_VARIANTS[variant] || PWA_ICON_VARIANTS.naranja;

  const appleLink = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleLink) appleLink.href = cfg.apple;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = PWA_THEME_COLOR;

  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) return;

  if (pwaManifestBlobUrl) {
    URL.revokeObjectURL(pwaManifestBlobUrl);
    pwaManifestBlobUrl = null;
  }

  const manifest = {
    name: "ROBIN - Trade & Shopper Marketing",
    short_name: "ROBIN",
    description: "Workspace de Trade & Shopper Marketing",
    start_url: "./index.html",
    scope: "./",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "es",
    icons: [
      {
        src: cfg.icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: cfg.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: cfg.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };

  pwaManifestBlobUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" })
  );
  manifestLink.href = pwaManifestBlobUrl;
}

(function registerRobinPwa() {
  document.documentElement.classList.add("robin-app");

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isMobile = window.matchMedia("(max-width: 1023px)").matches;

  if (isStandalone) {
    document.documentElement.classList.add("robin-pwa-standalone");
  }

  if (isStandalone || isMobile) {
    const opts = { passive: false };
    const stop = (e) => e.preventDefault();
    document.addEventListener("gesturestart", stop, opts);
    document.addEventListener("gesturechange", stop, opts);
    document.addEventListener("gestureend", stop, opts);
    document.addEventListener("touchstart", (e) => {
      if (e.touches.length > 1) stop(e);
    }, opts);
    document.addEventListener("touchmove", (e) => {
      if (e.touches.length > 1) stop(e);
    }, opts);
  }

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then((reg) => {
        reg.update();
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      })
      .catch((err) => console.warn("ROBIN PWA: service worker no registrado", err));
  });
})();

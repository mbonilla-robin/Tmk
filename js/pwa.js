(function registerRobinPwa() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .catch((err) => console.warn("ROBIN PWA: service worker no registrado", err));
  });

  document.documentElement.classList.add("robin-app");

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;

  if (isStandalone) {
    document.documentElement.classList.add("robin-pwa-standalone");
  }

  if (isStandalone || isMobile) {
    const blockGesture = (e) => e.preventDefault();
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
    document.addEventListener("gestureend", blockGesture, { passive: false });
  }
})();

(function registerRobinPwa() {
  document.documentElement.classList.add("robin-app");

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;

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
      .catch((err) => console.warn("ROBIN PWA: service worker no registrado", err));
  });
})();

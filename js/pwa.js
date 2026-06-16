(function registerRobinPwa() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .catch((err) => console.warn("ROBIN PWA: service worker no registrado", err));
  });

  document.documentElement.classList.add("robin-app");
  if (window.matchMedia("(display-mode: standalone)").matches) {
    document.documentElement.classList.add("robin-pwa-standalone");
  }
})();

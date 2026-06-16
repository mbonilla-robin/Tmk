// Renderizar la Aplicación
(function registerRobinBoot() {
  const container = document.getElementById("root");
  if (!container) return;

  const showBootError = (message) => {
    container.innerHTML = `
      <div style="font-family:Inter,sans-serif;padding:24px;max-width:420px;margin:40px auto;color:#37352F;">
        <p style="font-weight:700;margin-bottom:8px;">No se pudo cargar ROBIN</p>
        <p style="font-size:13px;color:#71717a;line-height:1.5;margin-bottom:12px;">${message}</p>
        <button type="button" onclick="location.reload()" style="padding:8px 12px;border:1px solid #e4e4e7;border-radius:6px;background:#fff;font-size:12px;font-weight:600;cursor:pointer;">
          Recargar
        </button>
      </div>
    `;
  };

  class RobinErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
      return { error };
    }

    componentDidCatch(error, info) {
      console.error("ROBIN render error", error, info);
    }

    render() {
      if (this.state.error) {
        return (
          <div style={{ fontFamily: "Inter,sans-serif", padding: 24, maxWidth: 420, margin: "40px auto", color: "#37352F" }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Error al mostrar la app</p>
            <p style={{ fontSize: 13, color: "#71717a", lineHeight: 1.5, marginBottom: 12 }}>
              {String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)}
            </p>
            <button
              type="button"
              onClick={() => location.reload()}
              style={{ padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Recargar
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  function bootRobinApp() {
    try {
      if (window.location.protocol === "file:") {
        showBootError(
          "No abras index.html directamente desde el disco. Usa un servidor local (Live Server, python -m http.server, o la URL publicada de la PWA)."
        );
        return;
      }
      if (typeof React === "undefined" || typeof ReactDOM === "undefined") {
        showBootError("React no cargó. Revisa tu conexión e inténtalo de nuevo.");
        return;
      }
      if (typeof App !== "function") {
        showBootError("La aplicación no compiló. Prueba recargar o borrar la caché de la PWA.");
        return;
      }
      const root = ReactDOM.createRoot(container);
      root.render(
        <RobinErrorBoundary>
          <App />
        </RobinErrorBoundary>
      );
    } catch (err) {
      console.error("ROBIN boot error", err);
      showBootError(String(err && err.message ? err.message : err));
    }
  }

  let attempts = 0;
  const MAX_BOOT_ATTEMPTS = 100;

  function scheduleBoot() {
    if (typeof App === "function") {
      bootRobinApp();
      return;
    }
    attempts += 1;
    if (attempts >= MAX_BOOT_ATTEMPTS) {
      bootRobinApp();
      return;
    }
    setTimeout(scheduleBoot, 50);
  }

  if (document.readyState === "complete") {
    scheduleBoot();
  } else {
    window.addEventListener("load", scheduleBoot);
  }
})();

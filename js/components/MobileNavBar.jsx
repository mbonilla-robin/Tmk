function MobileNavBar({
  paginaActiva,
  navegarA,
  filtroMarca,
  setFiltroMarca,
  setFiltroTiempo,
  setFiltroEstado,
  setFiltroPrioridad,
  setFiltroPersona,
  usuario,
  syncing,
  apiError,
  palabraEstadoSync,
  onSyncClick,
  onRefresh,
  loading,
  theme = "notion",
  notificacionesSlot = null
}) {
  const isActive = (pagina, extraCheck) => {
    if (paginaActiva !== pagina) return false;
    return extraCheck ? extraCheck() : true;
  };

  const navItems = [
    {
      key: "home",
      label: "Home",
      icon: "fa-house",
      active: isActive("home"),
      onClick: () => navegarA("home")
    },
    {
      key: "dashboard-all",
      label: "Lista",
      icon: "fa-list",
      active: isActive("dashboard", () => filtroMarca === "TODAS"),
      onClick: () => navegarA("dashboard", () => {
        setFiltroTiempo("TODAS");
        setFiltroMarca("TODAS");
        setFiltroEstado("TODOS");
        setFiltroPrioridad("TODAS");
        setFiltroPersona("TODAS");
      })
    },
    {
      key: "agregar",
      label: "Añadir",
      icon: "fa-plus",
      highlight: true,
      active: isActive("agregar"),
      onClick: () => navegarA("agregar")
    },
    {
      key: "clientes",
      label: "Clientes",
      icon: "fa-layer-group",
      active: isActive("clientes"),
      onClick: () => navegarA("clientes")
    },
    {
      key: "config",
      label: "Ajustes",
      icon: "fa-sliders",
      active: isActive("configuracion"),
      onClick: () => navegarA("configuracion")
    }
  ];

  return (
    <>
      <header className="mobile-top-bar md:hidden">
        <div className="mobile-top-brand">
          <RobinLogo className="h-8 w-auto max-w-[110px]" theme={theme} />
        </div>

        <div className="mobile-top-actions">
          {notificacionesSlot}
          <button
            type="button"
            onClick={onSyncClick}
            className={`mobile-top-btn ${syncing ? "is-syncing" : apiError ? "is-error" : "is-ok"}`}
            title={palabraEstadoSync}
          >
            <i className={`fa-solid ${syncing ? "fa-cloud-arrow-up" : apiError ? "fa-cloud-arrow-down" : "fa-cloud"}`}></i>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="mobile-top-btn"
            title="Actualizar"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? "animate-spin" : ""}`}></i>
          </button>
        </div>
      </header>

      <nav className="mobile-nav-bar md:hidden" aria-label="Navegación principal">
        <div className="mobile-nav-grid">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={`mobile-nav-item ${item.active ? "is-active" : ""} ${item.highlight ? "is-highlight" : ""}`}
            >
              <span className="mobile-nav-icon">
                <i className={`fa-solid ${item.icon}`}></i>
              </span>
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

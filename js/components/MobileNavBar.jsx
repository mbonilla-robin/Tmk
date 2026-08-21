function MobileNavQuickMenu({ acciones, onClose, anchorKey }) {
  if (!acciones || acciones.length === 0) return null;

  return (
    <>
      <button type="button" className="mobile-quick-menu-backdrop" onClick={onClose} aria-label="Cerrar menú" />
      <div className={`mobile-quick-menu mobile-quick-menu--${anchorKey}`} role="menu">
        <p className="mobile-quick-menu__hint">Mantén presionado para accesos rápidos</p>
        {acciones.map((accion) => (
          <button
            key={accion.id}
            type="button"
            role="menuitem"
            className="mobile-quick-menu__item"
            onClick={() => {
              onClose();
              accion.onClick();
            }}
          >
            <i className={`fa-solid ${accion.icon}`} aria-hidden="true" />
            <span>{accion.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function MobileNavItem({ item, induccionTarget, quickActions, onQuickOpen }) {
  const skipClickRef = useRef(false);

  const longPress = useLongPress(() => {
    if (quickActions && quickActions.length > 0) {
      skipClickRef.current = true;
      onQuickOpen(item.key, quickActions);
    }
  });

  return (
    <button
      key={item.key}
      type="button"
      onClick={() => {
        if (skipClickRef.current) {
          skipClickRef.current = false;
          return;
        }
        item.onClick();
      }}
      data-induccion={induccionTarget || undefined}
      className={`mobile-nav-item ${item.active ? "is-active" : ""} ${item.highlight ? "is-highlight" : ""}`}
      {...longPress}
    >
      <span className="mobile-nav-icon">
        <i className={`fa-solid ${item.icon}`}></i>
      </span>
      <span className="mobile-nav-label">{item.label}</span>
    </button>
  );
}

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
  esDisenador = false,
  syncing,
  apiError,
  hayPendientesLocales,
  syncDetalleVisible,
  palabraEstadoSync,
  onSyncClick,
  theme = "notion",
  notificacionesSlot = null,
  onAtajoFiltro,
  onAbrirEquipos,
  onAbrirEstatus,
  onAbrirInformes,
  onCrearRapido,
  onAbrirBuscador
}) {
  const [quickMenu, setQuickMenu] = useState(null);

  const isActive = (pagina, extraCheck) => {
    if (paginaActiva !== pagina) return false;
    return extraCheck ? extraCheck() : true;
  };

  const quickActionsByKey = useMemo(() => {
    const map = {};

    if (!esDisenador) {
      map.home = [
        ...(onAbrirEquipos ? [{ id: "equipos", label: "Ver equipos", icon: "fa-users", onClick: onAbrirEquipos }] : []),
        ...(onAbrirEstatus ? [{ id: "estatus", label: "Generar estatus", icon: "fa-file-lines", onClick: onAbrirEstatus }] : []),
        ...(onAbrirInformes ? [{ id: "informes", label: "Generar informes", icon: "fa-chart-pie", onClick: onAbrirInformes }] : [])
      ];
    }

    if (onAtajoFiltro) {
      map["dashboard-all"] = [
        { id: "hoy", label: "Hoy", icon: "fa-calendar-day", onClick: () => onAtajoFiltro("hoy") },
        { id: "atrasadas", label: "Atrasadas", icon: "fa-clock", onClick: () => onAtajoFiltro("atrasadas") },
        { id: "revision", label: "En revisión", icon: "fa-eye", onClick: () => onAtajoFiltro("revision") }
      ];
      if (!esDisenador) {
        map["dashboard-all"].push({
          id: "sin-disenador",
          label: "Sin diseñador",
          icon: "fa-user-slash",
          onClick: () => onAtajoFiltro("sin-disenador")
        });
      } else {
        map["dashboard-all"].unshift({
          id: "mias",
          label: "Mis tareas",
          icon: "fa-user",
          onClick: () => onAtajoFiltro("mias")
        });
      }
    }

    if (!esDisenador) {
      map.agregar = [
        ...(onCrearRapido ? [{ id: "rapido", label: "Crear rápido", icon: "fa-bolt", onClick: onCrearRapido }] : []),
        { id: "completo", label: "Formulario completo", icon: "fa-file-circle-plus", onClick: () => navegarA("agregar") }
      ];
    }

    return map;
  }, [esDisenador, onAtajoFiltro, onAbrirEquipos, onAbrirEstatus, onAbrirInformes, onCrearRapido, navegarA]);

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
    ...(!esDisenador ? [{
      key: "agregar",
      label: "Añadir",
      icon: "fa-plus",
      highlight: true,
      active: isActive("agregar"),
      onClick: () => navegarA("agregar")
    }] : []),
    ...(!esDisenador ? [{
      key: "clientes",
      label: "Clientes",
      icon: "fa-layer-group",
      active: isActive("clientes"),
      onClick: () => navegarA("clientes")
    }] : []),
    {
      key: "config",
      label: "Ajustes",
      icon: "fa-sliders",
      active: isActive("configuracion"),
      onClick: () => navegarA("configuracion")
    }
  ];

  const induccionTargetByKey = {
    home: "nav-home",
    "dashboard-all": "nav-lista",
    agregar: "nav-agregar",
    clientes: "nav-clientes",
    config: "nav-config"
  };

  return (
    <>
      <header className="mobile-top-bar md:hidden">
        <div className="mobile-top-brand">
          <RobinLogo className="mobile-top-brand__logo" theme={theme} />
        </div>

        <div className="mobile-top-actions">
          {typeof onAbrirBuscador === "function" && (
            <BuscadorSpotlightTrigger compacto onClick={onAbrirBuscador} />
          )}
          {notificacionesSlot}
          <button
            type="button"
            onClick={onSyncClick}
            data-induccion="sync"
            className={`mobile-top-btn ${
              syncDetalleVisible
                ? "is-active"
                : syncing
                  ? "is-syncing"
                  : apiError
                    ? "is-error"
                    : hayPendientesLocales
                      ? "is-pending"
                      : "is-ok"
            }`}
            title={palabraEstadoSync}
          >
            <i className={`fa-solid ${
              syncing
                ? "fa-cloud-arrow-up"
                : apiError
                  ? "fa-cloud-arrow-down"
                  : hayPendientesLocales
                    ? "fa-cloud-arrow-up"
                    : "fa-cloud"
            }`}></i>
          </button>
        </div>
      </header>

      <nav className="mobile-nav-bar md:hidden" aria-label="Navegación principal">
        <div
          className="mobile-nav-grid"
          style={{ "--mobile-nav-cols": navItems.length }}
        >
          {navItems.map((item) => (
            <MobileNavItem
              key={item.key}
              item={item}
              induccionTarget={induccionTargetByKey[item.key]}
              quickActions={quickActionsByKey[item.key]}
              onQuickOpen={(key, acciones) => setQuickMenu({ key, acciones })}
            />
          ))}
        </div>
      </nav>

      {quickMenu && (
        <MobileNavQuickMenu
          acciones={quickMenu.acciones}
          anchorKey={quickMenu.key}
          onClose={() => setQuickMenu(null)}
        />
      )}
    </>
  );
}

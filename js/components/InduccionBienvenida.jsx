function obtenerPrimerNombreBienvenida(nombreCompleto, username) {
  const display = typeof formatearNombrePresencia === "function"
    ? formatearNombrePresencia({ nombre: nombreCompleto, username })
    : (nombreCompleto || username || "");
  const primero = String(display).trim().split(/\s+/)[0];
  if (primero && !/^@/.test(primero)) return primero;
  return username ? `@${String(username).replace(/^@/, "")}` : "equipo";
}

function filtrarClientesActivosInduccion(marcas) {
  const lista = Array.isArray(marcas) ? marcas : [];
  return lista
    .filter((m) => {
      const key = typeof normalizarMarcaKey === "function" ? normalizarMarcaKey(m) : String(m).toUpperCase();
      return key && key !== "TMK" && key !== "ROBIN";
    })
    .map((m) => (typeof formatearMarca === "function" ? formatearMarca(m) : m))
    .filter(Boolean);
}

function InduccionBienvenida({
  visible,
  nombreCompleto,
  username,
  esDisenador,
  marcas,
  onComenzar,
  onOmitir
}) {
  if (!visible) return null;

  const primerNombre = obtenerPrimerNombreBienvenida(nombreCompleto, username);
  const rolLabel = esDisenador ? "diseñador" : "ejecutivo";
  const clientes = filtrarClientesActivosInduccion(marcas);

  return (
    <ModalPortal>
      <div className="induccion-bienvenida" role="dialog" aria-modal="true" aria-labelledby="induccion-bienvenida-title">
        <div className="induccion-bienvenida__bg" aria-hidden="true">
          <div className="induccion-bienvenida__gradient" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--1" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--2" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--3" />
          <div className="induccion-bienvenida__blob induccion-bienvenida__blob--4" />
          <div className="induccion-bienvenida__grain" />
        </div>

        <div className="induccion-bienvenida__panel">
          <div className="induccion-bienvenida__top">
            <div className="induccion-bienvenida__brand induccion-bienvenida__reveal induccion-bienvenida__reveal--1">
              <img
                src="logo robin blanco.png"
                srcSet="logo robin blanco.png 1x, logo robin blanco@2x.png 2x"
                alt="ROBIN"
                className="induccion-bienvenida__logo"
                width="222"
                height="73"
                decoding="async"
              />
            </div>

            <p className="induccion-bienvenida__eyebrow induccion-bienvenida__reveal induccion-bienvenida__reveal--2">
              Trade &amp; Shopper Marketing
            </p>

            <div className="induccion-bienvenida__hero induccion-bienvenida__reveal induccion-bienvenida__reveal--3">
              <h1 id="induccion-bienvenida-title" className="induccion-bienvenida__title">
                <span className="induccion-bienvenida__saludo">Bienvenido,</span>
                <span className="induccion-bienvenida__nombre">{primerNombre}</span>
              </h1>
              <p className="induccion-bienvenida__subtitle">
                Sistema interno del área · como <span className="induccion-bienvenida__rol">{rolLabel}</span>
              </p>
            </div>
          </div>

          <div className="induccion-bienvenida__middle">
            <div className="induccion-bienvenida__body induccion-bienvenida__reveal induccion-bienvenida__reveal--4">
            <p>
              Te invitamos a utilizar esta plataforma para que todo el equipo estemos comunicados
              y alineados en los entregables de cada cliente.
            </p>
            <p>
              ROBIN fue desarrollada por el equipo interno con el plan de cumplir las metas
              y necesidades del área en este momento.
            </p>
          </div>

          {clientes.length > 0 && (
            <div className="induccion-bienvenida__clientes induccion-bienvenida__reveal induccion-bienvenida__reveal--5">
              <span className="induccion-bienvenida__clientes-label">Clientes activos</span>
              <div className="induccion-bienvenida__clientes-list">
                {clientes.map((nombre, index) => (
                  <span
                    key={nombre}
                    className="induccion-bienvenida__cliente-chip"
                    style={{ animationDelay: `${0.55 + index * 0.07}s` }}
                  >
                    {nombre}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="induccion-bienvenida__cierre induccion-bienvenida__reveal induccion-bienvenida__reveal--6">
            Gracias por ser parte del equipo. Cualquier duda, estamos a la orden.
          </p>
          </div>

          <div className="induccion-bienvenida__actions induccion-bienvenida__reveal induccion-bienvenida__reveal--7">
            <button type="button" className="induccion-bienvenida__btn-primary" onClick={onComenzar}>
              Comenzar recorrido
            </button>
            <button type="button" className="induccion-bienvenida__btn-ghost" onClick={onOmitir}>
              Omitir por ahora
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

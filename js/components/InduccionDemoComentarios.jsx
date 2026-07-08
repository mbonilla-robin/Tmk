function InduccionDemoComentarios() {
  return (
    <div className="induccion-demo-comentarios md:hidden" data-induccion="comentarios-demo" aria-hidden="true">
      <div className="induccion-demo-comentarios__sheet">
        <p className="induccion-demo-comentarios__task">Propuesta · Buchanan&apos;s</p>

        <article className="robin-comment induccion-demo-comentarios__comment">
          <span className="robin-comment-avatar" style={{ backgroundColor: "#6366f1" }} aria-hidden="true">MR</span>
          <div className="robin-comment__content">
            <div className="robin-comment__meta">
              <span className="robin-comment__author">María R.</span>
              <span className="robin-comment__time">hace 2 h</span>
            </div>
            <p className="induccion-demo-comentarios__body">
              ¿Podemos mover la entrega al viernes? El cliente pidió un ajuste en el arte.
            </p>
          </div>
        </article>

        <article className="robin-comment induccion-demo-comentarios__comment">
          <span className="robin-comment-avatar" style={{ backgroundColor: "#0d9488" }} aria-hidden="true">JL</span>
          <div className="robin-comment__content">
            <div className="robin-comment__meta">
              <span className="robin-comment__author">José L.</span>
              <span className="robin-comment__time">hace 1 h</span>
            </div>
            <p className="induccion-demo-comentarios__body">
              Sin problema. @María dejo el link del drive en la tarea cuando esté listo.
            </p>
          </div>
        </article>

        <div className="induccion-demo-comentarios__composer">
          <span className="induccion-demo-comentarios__composer-hint">Escribe un comentario…</span>
          <span className="induccion-demo-comentarios__composer-send">
            <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  );
}

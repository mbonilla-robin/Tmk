function AvatarComentario({ author, nombre, avatarUrl }) {
  const etiqueta = nombre || obtenerNombreAutorComentario(author);
  const iniciales = obtenerInicialesAutor(author, etiqueta);
  const fondo = colorAvatarAutor(author);

  if (avatarUrl) {
    return (
      <span
        className="robin-comment-avatar robin-comment-avatar--photo"
        style={{ backgroundImage: `url(${avatarUrl})` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className="robin-comment-avatar"
      style={{ backgroundColor: fondo }}
      aria-hidden="true"
    >
      {iniciales}
    </span>
  );
}

function ComentarioItem({ comentario, usuarioActual, onResponder, perfil }) {
  const esMio = normalizeRobinUser(comentario.author) === normalizeRobinUser(usuarioActual);
  const autorLabel = nombreVisiblePerfil(perfil, comentario.author);

  return (
    <article className="robin-comment">
      <AvatarComentario
        author={comentario.author}
        nombre={autorLabel}
        avatarUrl={perfil?.avatarUrl}
      />
      <div className="robin-comment__content">
        <div className="robin-comment__meta">
          <span className="robin-comment__author">{autorLabel}</span>
          <span className="robin-comment__time">{formatearTiempoRelativo(comentario.created_at)}</span>
          {!esMio && (
            <button
              type="button"
              className="robin-comment__reply-btn"
              onClick={() => onResponder(comentario)}
            >
              Responder
            </button>
          )}
        </div>
        <div
          className="robin-comment__body"
          dangerouslySetInnerHTML={{ __html: renderizarCuerpoComentario(comentario.body) }}
        />
      </div>
    </article>
  );
}

function ComentariosTarea({ tarea, usuario, nombreUsuario, listaPersonas, onComentarioPublicado, onToast }) {
  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState("");
  const [respondiendoA, setRespondiendoA] = useState(null);
  const [sugerencias, setSugerencias] = useState([]);
  const [sugerenciaIdx, setSugerenciaIdx] = useState(0);
  const [perfilesAutores, setPerfilesAutores] = useState({});
  const [miPerfil, setMiPerfil] = useState(null);
  const textareaRef = useRef(null);

  const clavesTarea = useMemo(
    () => clavesBusquedaComentariosTarea(tarea),
    [tarea?.idTarea, tarea?.marca, tarea?.info, tarea?.categoria]
  );

  const recargar = useCallback(async () => {
    setCargando(true);
    const lista = await fetchComentariosTarea(tarea);
    setComentarios(lista);
    const autores = [...new Set((lista || []).map((c) => c.author).filter(Boolean))];
    if (usuario) autores.push(usuario);
    const mapa = await precargarPerfilesUsuarios(autores);
    setPerfilesAutores(mapa);
    if (usuario) {
      const yo = typeof normalizeRobinUser === "function" ? normalizeRobinUser(usuario) : usuario;
      setMiPerfil(mapa[yo] || await obtenerPerfilUsuario(usuario));
    }
    setCargando(false);
  }, [tarea, clavesTarea.join("|"), usuario]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const detectarMencionActiva = (valor, cursorPos) => {
    const antes = valor.slice(0, cursorPos);
    const match = antes.match(MENCION_ACTIVA_RE);
    if (!match) {
      setSugerencias([]);
      return null;
    }
    return match[1];
  };

  const insertarMencion = (handle) => {
    const el = textareaRef.current;
    if (!el) return;

    const cursor = el.selectionStart || 0;
    const valor = texto;
    const antes = valor.slice(0, cursor);
    const despues = valor.slice(cursor);
    const match = antes.match(MENCION_ACTIVA_RE);
    if (!match) return;

    const prefijo = antes.slice(0, match.index);
    const mencion = formatearHandleCanonico(handle);
    const nuevo = `${prefijo}${mencion}${despues}`;
    setTexto(nuevo);
    setSugerencias([]);

    requestAnimationFrame(() => {
      const pos = (prefijo + mencion).length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const insertarArroba = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const nuevo = `${texto.slice(0, start)}@${texto.slice(end)}`;
    setTexto(nuevo);

    requestAnimationFrame(() => {
      const pos = start + 1;
      el.focus();
      el.setSelectionRange(pos, pos);
      setSugerencias(obtenerSugerenciasMencion("", listaPersonas));
      setSugerenciaIdx(0);
    });
  };

  const handleChangeTexto = (e) => {
    const val = e.target.value;
    setTexto(val);
    const cursor = e.target.selectionStart || val.length;
    const query = detectarMencionActiva(val, cursor);
    if (query !== null) {
      if (mencionYaCompleta(query, listaPersonas)) {
        setSugerencias([]);
        return;
      }
      setSugerencias(obtenerSugerenciasMencion(query, listaPersonas));
      setSugerenciaIdx(0);
    } else {
      setSugerencias([]);
    }
  };

  const enviarComentario = async () => {
    const body = texto.trim();
    if (!body || enviando) return;

    setEnviando(true);
    const resultado = await publicarComentario({
      tarea,
      author: usuario,
      body,
      parentId: respondiendoA ? respondiendoA.id : null,
      parentAuthor: respondiendoA ? respondiendoA.author : null,
      listaPersonas
    });

    if (resultado.ok) {
      setTexto("");
      setRespondiendoA(null);
      setSugerencias([]);
      if (resultado.comentario) {
        setComentarios((prev) => {
          const ids = new Set(prev.map((c) => c.id));
          if (ids.has(resultado.comentario.id)) return prev;
          return [...prev, resultado.comentario];
        });
      }
      await recargar();
      if (typeof onToast === "function") {
        onToast("Comentario publicado", "success");
      }
      if (typeof onComentarioPublicado === "function") {
        onComentarioPublicado();
      }
    } else if (typeof onToast === "function") {
      onToast(resultado.error || "No se pudo publicar el comentario", "error");
    }
    setEnviando(false);
  };

  const handleKeyDown = (e) => {
    if (sugerencias.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSugerenciaIdx((i) => (i + 1) % sugerencias.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSugerenciaIdx((i) => (i - 1 + sugerencias.length) % sugerencias.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertarMencion(sugerencias[sugerenciaIdx]);
      } else if (e.key === "Escape") {
        setSugerencias([]);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarComentario();
    }
  };

  const cancelarRespuesta = () => setRespondiendoA(null);

  const puedeEnviar = Boolean(texto.trim()) && !enviando;

  return (
    <div className="robin-comments-block">
      <h3 className="robin-comments-title">Comentarios</h3>

      {comentarios.length > 0 && (
        <div className="robin-comments-thread">
          {comentarios.map((c) => {
            const key = typeof normalizeRobinUser === "function"
              ? normalizeRobinUser(c.author)
              : String(c.author || "").replace(/^@/, "").trim().toLowerCase();
            return (
            <ComentarioItem
              key={c.id}
              comentario={c}
              usuarioActual={usuario}
              perfil={perfilesAutores[key]}
              onResponder={(com) => {
                setRespondiendoA(com);
                const mencion = formatearHandleCanonico(com.author);
                setTexto((prev) => (prev.trim() ? prev : mencion));
                textareaRef.current?.focus();
              }}
            />
            );
          })}
        </div>
      )}

      {respondiendoA && (
        <div className="robin-comment-reply-banner">
          <span>Respondiendo a {formatearHandleCanonico(respondiendoA.author)}</span>
          <button type="button" onClick={cancelarRespuesta} aria-label="Cancelar respuesta">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      <div className="robin-comment-compose">
        <AvatarComentario
          author={usuario}
          nombre={nombreVisiblePerfil(miPerfil, usuario) || nombreUsuario}
          avatarUrl={miPerfil?.avatarUrl}
        />
        <div className="robin-comment-input-wrap">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={handleChangeTexto}
            onKeyDown={handleKeyDown}
            placeholder="Añadir un comentario…"
            rows={1}
            className="robin-comment-input"
            disabled={enviando}
          />
          {sugerencias.length > 0 && (
            <ul className="robin-mention-suggestions" role="listbox">
              {sugerencias.map((handle, idx) => (
                <li key={handle}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === sugerenciaIdx}
                    className={idx === sugerenciaIdx ? "is-active" : ""}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      insertarMencion(handle);
                    }}
                  >
                    {formatearHandleCanonico(handle)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="robin-comment-compose__actions">
          <button
            type="button"
            className="robin-comment-action"
            onClick={insertarArroba}
            title="Mencionar"
            aria-label="Mencionar"
          >
            <i className="fa-solid fa-at" />
          </button>
          <button
            type="button"
            disabled={!puedeEnviar}
            onClick={enviarComentario}
            className={`robin-comment-send ${puedeEnviar ? "is-ready" : ""}`}
            title="Enviar comentario"
            aria-label="Enviar comentario"
          >
            <i className="fa-solid fa-arrow-up" />
          </button>
        </div>
      </div>
    </div>
  );
}

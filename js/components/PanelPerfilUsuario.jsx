function PanelPerfilUsuario({
  usuario,
  perfilNombre,
  perfilApellido,
  perfilCorreo,
  perfilAvatar,
  onChangeNombre,
  onChangeApellido,
  onChangeCorreo,
  onChangeAvatar,
  onGuardar,
  currentTheme,
  theme
}) {
  const inputClass = `w-full border ${currentTheme.border} px-3 py-2 text-sm rounded font-semibold ${currentTheme.text} ${theme === "midnight" ? "bg-zinc-900" : "bg-zinc-50"}`;
  const nombreVisible = construirNombreCompletoPerfil(perfilNombre, perfilApellido) || `@${usuario}`;

  const handleImagen = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || typeof onChangeAvatar !== "function") return;
    try {
      const dataUrl = await comprimirImagenPerfil(file);
      onChangeAvatar(dataUrl);
    } catch (err) {
      console.warn("ROBIN: imagen de perfil", err);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <form onSubmit={onGuardar} className={`${currentTheme.cardBg} border ${currentTheme.border} p-4 rounded-md flex flex-col gap-4`}>
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer group shrink-0">
          <span
            className="robin-profile-avatar-preview"
            style={perfilAvatar ? { backgroundImage: `url(${perfilAvatar})` } : undefined}
          >
            {!perfilAvatar && (
              <span>{obtenerInicialesAutor(usuario, nombreVisible)}</span>
            )}
          </span>
          <span className="robin-profile-avatar-edit">
            <i className="fa-solid fa-camera" />
          </span>
          <input type="file" accept="image/*" style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }} onChange={handleImagen} />
        </label>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${currentTheme.text}`}>{nombreVisible}</p>
          <p className={`text-xs ${currentTheme.mutedText}`}>@{usuario}</p>
          <p className={`text-[11px] ${currentTheme.mutedText} mt-1`}>Tu foto aparece en los comentarios.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={`block text-[10px] font-semibold ${currentTheme.mutedText} mb-1`}>Nombre</label>
          <input
            type="text"
            placeholder="Francisco"
            value={perfilNombre}
            onChange={(e) => onChangeNombre(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={`block text-[10px] font-semibold ${currentTheme.mutedText} mb-1`}>Apellido</label>
          <input
            type="text"
            placeholder="Colmenares"
            value={perfilApellido}
            onChange={(e) => onChangeApellido(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={`block text-[10px] font-semibold ${currentTheme.mutedText} mb-1`}>Correo</label>
        <input
          type="email"
          placeholder="nombre@empresa.com"
          value={perfilCorreo}
          onChange={(e) => onChangeCorreo(e.target.value)}
          className={inputClass}
          autoComplete="email"
        />
      </div>

      {perfilAvatar && (
        <button
          type="button"
          onClick={() => onChangeAvatar("")}
          className="self-start text-[11px] font-semibold text-zinc-500 hover:text-red-600"
        >
          Quitar foto
        </button>
      )}

      <button type="submit" className={`w-full sm:w-auto self-start px-5 py-2.5 ${currentTheme.primary} text-ui font-semibold rounded-md`}>
        Guardar perfil
      </button>
    </form>
  );
}

function CuadroMedidas({ value, onChange, onSave, compact = false, disabled = false }) {
  const medidas = typeof normalizarMedidas === "function"
    ? normalizarMedidas(value)
    : (value || { activo: false, ancho: "", alto: "", profundidad: "", unidad: "cm" });
  const unidades = typeof UNIDADES_MEDIDA !== "undefined"
    ? UNIDADES_MEDIDA
    : [
      { id: "m", label: "Metros", corto: "m" },
      { id: "cm", label: "Centímetros", corto: "cm" },
      { id: "mm", label: "Milímetros", corto: "mm" }
    ];

  const setCampo = (campo, val) => {
    if (disabled || !onChange) return;
    onChange({ ...medidas, activo: true, [campo]: val });
  };

  const toggle = () => {
    if (disabled || !onChange) return;
    if (medidas.activo) onChange({ ...medidas, activo: false });
    else onChange({ ...medidas, activo: true, unidad: medidas.unidad || "cm" });
  };

  return (
    <div className={`cuadro-medidas ${compact ? "is-compact" : ""} ${medidas.activo ? "is-on" : ""}`}>
      <button
        type="button"
        className={`cuadro-medidas-toggle ${medidas.activo ? "is-on" : ""}`}
        onClick={toggle}
        disabled={disabled}
        aria-pressed={medidas.activo}
      >
        <i className="fa-solid fa-ruler-combined" aria-hidden="true" />
        Medidas
      </button>
      {medidas.activo ? (
        <div className="cuadro-medidas-box">
          <div className="cuadro-medidas-grid">
            <label>
              <span>Ancho</span>
              <input
                type="text"
                inputMode="decimal"
                value={medidas.ancho}
                disabled={disabled}
                placeholder="—"
                onChange={(e) => setCampo("ancho", e.target.value)}
              />
            </label>
            <label>
              <span>Alto</span>
              <input
                type="text"
                inputMode="decimal"
                value={medidas.alto}
                disabled={disabled}
                placeholder="—"
                onChange={(e) => setCampo("alto", e.target.value)}
              />
            </label>
            <label>
              <span>Profundidad</span>
              <input
                type="text"
                inputMode="decimal"
                value={medidas.profundidad}
                disabled={disabled}
                placeholder="—"
                onChange={(e) => setCampo("profundidad", e.target.value)}
              />
            </label>
          </div>
          <div className="cuadro-medidas-unidades" role="group" aria-label="Escala">
            {unidades.map((u) => (
              <button
                key={u.id}
                type="button"
                className={medidas.unidad === u.id ? "is-on" : ""}
                disabled={disabled}
                onClick={() => setCampo("unidad", u.id)}
              >
                {u.corto}
              </button>
            ))}
          </div>
          {!disabled && onSave ? (
            <button
              type="button"
              className="cuadro-medidas-save"
              onClick={onSave}
            >
              Guardar medidas
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

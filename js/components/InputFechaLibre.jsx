function InputFechaLibre({ value, onChange, className, required, placeholder, onBlurExtra }) {
  const handleBlur = (e) => {
    const raw = e.target.value.trim();
    if (!raw) {
      onChange("");
      if (onBlurExtra) onBlurExtra("");
      return;
    }
    if (esFechaValida(raw)) {
      const display = formatearFechaDisplay(raw);
      onChange(display);
      if (onBlurExtra) onBlurExtra(display);
    } else if (onBlurExtra) {
      onBlurExtra(raw);
    }
  };

  return (
    <input
      type="text"
      inputMode="text"
      autoComplete="off"
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder || "dd/mm/aaaa"}
      required={required}
      className={className}
      title="Ej: 16/06/2026, 16 06 2026 o 16-06-2026"
    />
  );
}

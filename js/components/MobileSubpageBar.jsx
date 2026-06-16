function MobileSubpageBar({ title, onBack, backLabel = "Volver" }) {
  return (
    <div className="mobile-subpage-bar robin-mobile-only">
      <button type="button" onClick={onBack} className="mobile-subpage-back">
        <i className="fa-solid fa-chevron-left text-[11px]"></i>
        <span>{backLabel}</span>
      </button>
      <h2 className="mobile-subpage-title">{title}</h2>
    </div>
  );
}

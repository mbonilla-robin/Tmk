function MobileSubpageBar({ title, onBack, backLabel = "Volver" }) {
  return (
    <div className="mobile-subpage-bar robin-mobile-only">
      <button type="button" onClick={onBack} className="mobile-subpage-back">
        <span className="mobile-subpage-back__icon" aria-hidden="true">
          <SVGIcon.ChevronRight className="mobile-subpage-back__chevron" />
        </span>
        <span className="mobile-subpage-back__label">{backLabel}</span>
      </button>
      <h2 className="mobile-subpage-title">{title}</h2>
    </div>
  );
}

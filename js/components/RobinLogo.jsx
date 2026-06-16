const RobinLogo = ({ className = "h-6 w-auto", theme }) => {
  const isDarkTheme = theme === "midnight";
  return (
    <img
      src="logo robin negro.png"
      alt="robin"
      className={`${className} ${isDarkTheme ? "invert brightness-200" : ""} object-contain`}
      onError={(e) => {
        e.target.style.display = "none";
        const span = e.target.parentNode.querySelector(".fallback-logo");
        if (span) span.style.display = "inline-block";
      }}
    />
  );
};

const LISTA_ESTADOS_VALIDOS = [
  "Pendiente",
  "En progreso",
  "Seguimiento",
  "En revision",
  "En pausa",
  "Completada"
];

const ESTADOS_MAPA = [
  { id: "Pendiente", dot: "bg-zinc-400", bg: "bg-zinc-50 text-zinc-600 border-zinc-200" },
  { id: "En progreso", dot: "bg-blue-500", bg: "bg-blue-50 text-blue-700 border-blue-150" },
  { id: "Seguimiento", dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-150" },
  { id: "En revision", dot: "bg-purple-500", bg: "bg-purple-50 text-purple-700 border-purple-150" },
  { id: "En pausa", dot: "bg-red-400", bg: "bg-red-50 text-red-700 border-red-150" },
  { id: "Completada", dot: "bg-emerald-500", bg: "bg-[#EDFBF2] text-emerald-700 border-emerald-150" }
];

const PRIORIDADES_MAPA = [
  { id: "Alta", label: "Alta", color: "bg-red-50 text-red-805 border-red-100" },
  { id: "Media", label: "Media", color: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  { id: "Baja", label: "Baja", color: "bg-zinc-50 text-zinc-500 border-zinc-100" }
];

const MARCAS_COLORES = {
  "LA SANTE": { id: "la-sante", accent: "#2F7A4E" },
  "DIAGEO": { id: "diageo", accent: "#71717A" },
  "GAMA": { id: "gama", accent: "#DC2626" },
  "ROBIN": { id: "robin", accent: "#37352F" },
  "TMK": { id: "trade", accent: "#EA580C" }
};

const MARCAS_COLORES_DEFAULT = { id: "otros", accent: "#71717A" };

const TEMAS = {
  notion: {
    bg: "bg-[#FFFFFF]",
    text: "text-[#37352F]",
    sidebarBg: "bg-[#F7F7F5]",
    cardBg: "bg-white",
    border: "border-[#EDEDEB]",
    borderMuted: "border-[#ECECE9]",
    primary: "bg-[#37352F] hover:bg-[#2c2a26] text-white",
    accent: "bg-[#EAE8E4]",
    mutedText: "text-zinc-500",
    inputBg: "bg-white border-zinc-200 text-[#37352F]",
  },
  midnight: {
    bg: "bg-[#09090B]",
    text: "text-zinc-100",
    sidebarBg: "bg-[#18181B]",
    cardBg: "bg-[#18181B]",
    border: "border-zinc-800",
    borderMuted: "border-zinc-800/60",
    primary: "bg-zinc-100 hover:bg-zinc-200 text-zinc-950",
    accent: "bg-zinc-800",
    mutedText: "text-zinc-400",
    inputBg: "bg-zinc-900 border-zinc-700 text-zinc-100",
  }
};

function applyRobinDocumentTheme(theme) {
  const resolved = theme === "midnight" ? "midnight" : "notion";
  document.documentElement.setAttribute("data-theme", resolved);
  const color = resolved === "midnight" ? "#09090B" : "#FFFFFF";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = color;
}

function themePickerBtnClass(activeTheme, option) {
  const isSelected = activeTheme === option;
  if (option === "notion") {
    return isSelected
      ? "theme-picker-btn is-active-light"
      : "theme-picker-btn is-inactive";
  }
  return isSelected
    ? "theme-picker-btn is-active-dark"
    : "theme-picker-btn is-inactive";
}

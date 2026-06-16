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
  "LA SANTE": { bg: "bg-[#EDF6EC]", text: "text-[#1C3D27]", border: "border-[#C5E0C8]" },
  "DIAGEO": { bg: "bg-[#F1F1EF]", text: "text-[#37352F]", border: "border-zinc-200" },
  "GAMA": { bg: "bg-[#FDEBEC]", text: "text-[#601E21]", border: "border-[#E8C4C6]" },
  "ROBIN": { bg: "bg-[#F4EEEE]", text: "text-[#44322E]", border: "border-[#D9C4C4]" },
  "TMK": { bg: "bg-[#FAEBDD]", text: "text-[#5C2B14]", border: "border-[#E8D0BC]" }
};

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
  },
  midnight: {
    bg: "bg-[#09090B]",
    text: "text-zinc-150",
    sidebarBg: "bg-[#18181B]",
    cardBg: "bg-[#18181B]",
    border: "border-zinc-800",
    borderMuted: "border-zinc-800/60",
    primary: "bg-zinc-100 hover:bg-zinc-200 text-zinc-950",
    accent: "bg-zinc-800",
  }
};

/**
 * Catálogo de piezas / materiales Trade (seleccionables en informes).
 * Persistido en localStorage; se puede ampliar desde el formulario.
 */

const PIEZAS_TRADE_STORAGE_KEY = "robin_piezas_trade_v1";

const PIEZAS_TRADE_DEFAULT = [
  "Cenefas",
  "Danglers",
  "Habladores",
  "Rompetráficos",
  "Stickers",
  "Banners",
  "Standee",
  "Tótem",
  "Wobbler",
  "Stopper",
  "Cubos PDV",
  "Cabeceras de góndola",
  "Revestimientos",
  "Vinilo de fachada",
  "Microperforado",
  "Marcos A4",
  "Backing",
  "Cartelera",
  "Preciadores",
  "Floor graphic",
  "Display / isla",
  "Colgantes",
  "Cintas / lazos",
  "Adaptaciones de caja",
  "Material freezer",
  "Señalética PDV",
  "Pop-up",
  "Flyer / volante"
];

function normalizarPiezaTrade(nombre) {
  return String(nombre || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clavePiezaTrade(nombre) {
  return normalizarPiezaTrade(nombre)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cargarPiezasTrade() {
  try {
    const raw = typeof getLocalStorageItemSafe === "function"
      ? getLocalStorageItemSafe(PIEZAS_TRADE_STORAGE_KEY)
      : localStorage.getItem(PIEZAS_TRADE_STORAGE_KEY);
    if (!raw) return PIEZAS_TRADE_DEFAULT.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return PIEZAS_TRADE_DEFAULT.slice();
    const map = new Map();
    [...PIEZAS_TRADE_DEFAULT, ...parsed].forEach((p) => {
      const n = normalizarPiezaTrade(p);
      if (!n) return;
      const k = clavePiezaTrade(n);
      if (!map.has(k)) map.set(k, n);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "es"));
  } catch {
    return PIEZAS_TRADE_DEFAULT.slice();
  }
}

function guardarPiezasTrade(lista) {
  const limpia = [];
  const seen = new Set();
  (lista || []).forEach((p) => {
    const n = normalizarPiezaTrade(p);
    if (!n) return;
    const k = clavePiezaTrade(n);
    if (seen.has(k)) return;
    seen.add(k);
    limpia.push(n);
  });
  limpia.sort((a, b) => a.localeCompare(b, "es"));
  const json = JSON.stringify(limpia);
  if (typeof setLocalStorageItemSafe === "function") setLocalStorageItemSafe(PIEZAS_TRADE_STORAGE_KEY, json);
  else localStorage.setItem(PIEZAS_TRADE_STORAGE_KEY, json);
  return limpia;
}

function agregarPiezaTrade(nombre) {
  const n = normalizarPiezaTrade(nombre);
  if (!n) return cargarPiezasTrade();
  const actual = cargarPiezasTrade();
  if (actual.some((p) => clavePiezaTrade(p) === clavePiezaTrade(n))) return actual;
  return guardarPiezasTrade([...actual, n]);
}

function parsePiezasSeleccionadas(valor) {
  if (Array.isArray(valor)) {
    return valor
      .map((item) => {
        if (item && typeof item === "object") {
          const nombre = normalizarPiezaTrade(item.nombre || item.name || "");
          if (!nombre) return null;
          return {
            nombre,
            versiones: Math.max(1, Number(item.versiones || item.cantidad || 1) || 1)
          };
        }
        const nombre = normalizarPiezaTrade(item);
        return nombre ? { nombre, versiones: 1 } : null;
      })
      .filter(Boolean);
  }
  return String(valor || "")
    .split(",")
    .map((s) => normalizarPiezaTrade(s))
    .filter(Boolean)
    .map((nombre) => ({ nombre, versiones: 1 }));
}

function serializarPiezasSeleccionadas(lista) {
  return parsePiezasSeleccionadas(lista)
    .map((p) => (p.versiones > 1 ? `${p.nombre} ×${p.versiones}` : p.nombre))
    .join(", ");
}

function sumaVersionesPiezas(lista) {
  return parsePiezasSeleccionadas(lista).reduce((s, p) => s + (p.versiones || 1), 0);
}

function nombresPiezas(lista) {
  return parsePiezasSeleccionadas(lista).map((p) => p.nombre);
}

window.PIEZAS_TRADE_DEFAULT = PIEZAS_TRADE_DEFAULT;
window.cargarPiezasTrade = cargarPiezasTrade;
window.guardarPiezasTrade = guardarPiezasTrade;
window.agregarPiezaTrade = agregarPiezaTrade;
window.parsePiezasSeleccionadas = parsePiezasSeleccionadas;
window.serializarPiezasSeleccionadas = serializarPiezasSeleccionadas;
window.sumaVersionesPiezas = sumaVersionesPiezas;
window.nombresPiezas = nombresPiezas;
window.clavePiezaTrade = clavePiezaTrade;
window.normalizarPiezaTrade = normalizarPiezaTrade;

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

function limpiarTextoPiezasPegado(texto) {
  return String(texto || "")
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "")
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u2008]/g, " ")
    .replace(/\r\n?/g, "\n");
}

/**
 * Parsea un párrafo/listado pegado (p. ej. de WhatsApp/Notes):
 *   1. Vinil Fachada.
 *   6. Floorgraphic Categorías (x5).
 *   12. Habladores Carnicería (x11).
 * Cantidad opcional: (xN), (×N), xN / ×N al final. Sin cantidad ⇒ 1.
 */
function parsePiezasDesdeTextoPegado(texto) {
  const limpio = limpiarTextoPiezasPegado(texto).trim();
  if (!limpio) return [];

  let lineas = limpio.split("\n").map((l) => l.trim()).filter(Boolean);

  // Si vino en un solo bloque, partir por "12. " / "12) "
  if (lineas.length === 1 && /\d+[.)]\s+\S/.test(limpio)) {
    lineas = limpio
      .split(/(?=(?:^|\s)\d+[.)]\s+)/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const map = new Map();

  lineas.forEach((raw) => {
    let linea = raw
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^[-•*]\s*/, "")
      .trim();
    if (!linea) return;

    let versiones = 1;
    const conParentesis = linea.match(/^(.*?)\s*\(\s*[x×]\s*(\d+)\s*\)\s*\.?$/i);
    if (conParentesis) {
      linea = conParentesis[1];
      versiones = Math.max(1, Number(conParentesis[2]) || 1);
    } else {
      const conSufijo = linea.match(/^(.*?)\s+[x×]\s*(\d+)\s*\.?$/i);
      if (conSufijo) {
        linea = conSufijo[1];
        versiones = Math.max(1, Number(conSufijo[2]) || 1);
      }
    }

    const nombre = normalizarPiezaTrade(linea.replace(/\.+$/, ""));
    if (!nombre) return;

    const key = clavePiezaTrade(nombre);
    const prev = map.get(key);
    if (prev) {
      map.set(key, { nombre: prev.nombre, versiones: prev.versiones + versiones });
    } else {
      map.set(key, { nombre, versiones });
    }
  });

  return Array.from(map.values());
}

/**
 * Parsea pegado, crea en catálogo lo que falte y devuelve la lista lista para el eje.
 */
function aplicarPiezasDesdeTextoPegado(texto) {
  const parsed = parsePiezasDesdeTextoPegado(texto);
  if (parsed.length === 0) return { piezas: [], catalogo: cargarPiezasTrade(), nuevas: [] };

  let catalogo = cargarPiezasTrade();
  const porClave = new Map(catalogo.map((p) => [clavePiezaTrade(p), p]));
  const nuevas = [];

  const piezas = parsed.map((item) => {
    const key = clavePiezaTrade(item.nombre);
    const existente = porClave.get(key);
    if (existente) {
      return { nombre: existente, versiones: item.versiones };
    }
    nuevas.push(item.nombre);
    catalogo = agregarPiezaTrade(item.nombre);
    porClave.set(key, item.nombre);
    return { nombre: item.nombre, versiones: item.versiones };
  });

  return { piezas, catalogo: cargarPiezasTrade(), nuevas };
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

  const str = String(valor || "").trim();
  if (!str) return [];

  // Listado con cantidades (xN) o numerado → parser de pegado
  if (/\(\s*[x×]\s*\d+\s*\)/i.test(str) || /^\s*\d+[.)]\s+\S/m.test(str) || str.includes("\n")) {
    const pegado = parsePiezasDesdeTextoPegado(str);
    if (pegado.length > 0) return pegado;
  }

  // Serializado propio: "Habladores ×4, Cenefas"
  if (/[×x]\s*\d+/i.test(str) && str.includes(",")) {
    return str
      .split(",")
      .map((parte) => {
        const t = normalizarPiezaTrade(parte);
        const m = t.match(/^(.*?)\s*[×x]\s*(\d+)\s*$/i);
        if (m) {
          const nombre = normalizarPiezaTrade(m[1]);
          return nombre
            ? { nombre, versiones: Math.max(1, Number(m[2]) || 1) }
            : null;
        }
        return t ? { nombre: t, versiones: 1 } : null;
      })
      .filter(Boolean);
  }

  return str
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
window.parsePiezasDesdeTextoPegado = parsePiezasDesdeTextoPegado;
window.aplicarPiezasDesdeTextoPegado = aplicarPiezasDesdeTextoPegado;
window.serializarPiezasSeleccionadas = serializarPiezasSeleccionadas;
window.sumaVersionesPiezas = sumaVersionesPiezas;
window.nombresPiezas = nombresPiezas;
window.clavePiezaTrade = clavePiezaTrade;
window.normalizarPiezaTrade = normalizarPiezaTrade;

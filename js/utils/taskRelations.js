const RELACIONES_STORAGE_KEY = "robin_task_relations_v1";
const SUGERENCIAS_DESCARTADAS_KEY = "robin_sugerencias_rel_descartadas_v1";

function safeSupabaseRelaciones() {
  try {
    return typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
  } catch (e) {
    return false;
  }
}

function supabaseRelHeaders(prefer) {
  if (typeof getSupabaseRestHeaders === "function") {
    return getSupabaseRestHeaders(prefer);
  }
  return { "Content-Type": "application/json" };
}

function supabaseRelUrl() {
  return typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
}

function resolverTaskKeyRelacion(tarea) {
  if (typeof resolverTaskKeyComentarios === "function") {
    return resolverTaskKeyComentarios(tarea);
  }
  return getTaskSelectionKey(tarea);
}

function parRelacionOrdenado(keyA, keyB) {
  const a = String(keyA || "").trim().toLowerCase();
  const b = String(keyB || "").trim().toLowerCase();
  if (!a || !b || a === b) return null;
  return a < b ? [a, b] : [b, a];
}

function claveSugerenciaDescartada(taskKey, otroKey) {
  const par = parRelacionOrdenado(taskKey, otroKey);
  if (!par) return "";
  return `${par[0]}|${par[1]}`;
}

function normalizarFilaRelacion(row) {
  if (!row) return null;
  const par = parRelacionOrdenado(row.task_key_a, row.task_key_b);
  if (!par) return null;
  return {
    id: row.id || null,
    task_key_a: par[0],
    task_key_b: par[1],
    created_by: String(row.created_by || "").trim(),
    created_at: row.created_at || null
  };
}

function cargarRelacionesLocales() {
  try {
    const raw = getLocalStorageItemSafe(RELACIONES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizarFilaRelacion).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function guardarRelacionesLocales(lista) {
  try {
    setLocalStorageItemSafe(RELACIONES_STORAGE_KEY, JSON.stringify(lista || []));
  } catch (e) {}
}

function cargarSugerenciasDescartadas() {
  try {
    const raw = getLocalStorageItemSafe(SUGERENCIAS_DESCARTADAS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter(Boolean));
  } catch (e) {
    return new Set();
  }
}

function guardarSugerenciaDescartada(taskKey, otroKey) {
  const clave = claveSugerenciaDescartada(taskKey, otroKey);
  if (!clave) return;
  const set = cargarSugerenciasDescartadas();
  set.add(clave);
  try {
    setLocalStorageItemSafe(SUGERENCIAS_DESCARTADAS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

function indiceRelacionesPorKey(relaciones) {
  const map = new Map();
  (relaciones || []).forEach((rel) => {
    if (!rel) return;
    const a = rel.task_key_a;
    const b = rel.task_key_b;
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a).add(b);
    map.get(b).add(a);
  });
  return map;
}

function keysRelacionadosDe(taskKey, relaciones) {
  const key = String(taskKey || "").trim().toLowerCase();
  if (!key) return [];
  const indice = indiceRelacionesPorKey(relaciones);
  const set = indice.get(key);
  return set ? Array.from(set) : [];
}

function tareaCoincideConKey(tarea, key) {
  const buscada = String(key || "").trim().toLowerCase();
  if (!buscada || !tarea) return false;
  if (typeof clavesBusquedaComentariosTarea === "function") {
    return clavesBusquedaComentariosTarea(tarea).some(
      (k) => String(k).toLowerCase() === buscada
    );
  }
  return resolverTaskKeyRelacion(tarea) === buscada;
}

function resolverTareasRelacionadas(tarea, tareas, relaciones) {
  const taskKey = resolverTaskKeyRelacion(tarea);
  const keys = keysRelacionadosDe(taskKey, relaciones);
  const vistos = new Set();
  const resultado = [];

  keys.forEach((key) => {
    const encontrada = (tareas || []).find((t) => tareaCoincideConKey(t, key));
    if (!encontrada || sonLaMismaTarea(tarea, encontrada)) return;
    const selKey = getTaskSelectionKey(encontrada);
    if (vistos.has(selKey)) return;
    vistos.add(selKey);
    resultado.push(encontrada);
  });

  return resultado;
}

function yaEstanRelacionadas(keyA, keyB, relaciones) {
  const par = parRelacionOrdenado(keyA, keyB);
  if (!par) return false;
  return (relaciones || []).some(
    (rel) => rel.task_key_a === par[0] && rel.task_key_b === par[1]
  );
}

function extraerPalabrasTitulo(tarea) {
  const titulo = tituloLimpioTarea(tarea) || String(tarea?.info || "").toLowerCase();
  return titulo
    .split(/[^a-záéíóúüñ0-9]+/i)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 4);
}

function diasEntreDeadlines(a, b) {
  const ta = obtenerTiempoFecha(a?.deadline);
  const tb = obtenerTiempoFecha(b?.deadline);
  if (!ta || !tb) return null;
  return Math.abs(ta - tb) / (1000 * 60 * 60 * 24);
}

function puntajeSugerenciaRelacion(origen, candidata) {
  if (!origen || !candidata || sonLaMismaTarea(origen, candidata)) return 0;
  if (!marcasCoinciden(origen.marca, candidata.marca)) return 0;

  let score = 0;

  const palabrasA = new Set(extraerPalabrasTitulo(origen));
  const palabrasB = extraerPalabrasTitulo(candidata);
  palabrasB.forEach((w) => {
    if (palabrasA.has(w)) score += 2;
  });

  const dias = diasEntreDeadlines(origen, candidata);
  if (dias !== null) {
    if (dias === 0) score += 4;
    else if (dias <= 7) score += 3;
    else if (dias <= 14) score += 1;
  }

  const catA = parseCategoriasTarea(origen.categoria).principal;
  const catB = parseCategoriasTarea(candidata.categoria).principal;
  if (catA && catB && catA === catB) score += 1;

  const personasA = new Set(
    String(origen.personas || "")
      .split(/[\s,]+/)
      .map((p) => p.replace(/^@/, "").toLowerCase())
      .filter(Boolean)
  );
  String(candidata.personas || "")
    .split(/[\s,]+/)
    .map((p) => p.replace(/^@/, "").toLowerCase())
    .filter(Boolean)
    .forEach((p) => {
      if (personasA.has(p)) score += 1;
    });

  return score;
}

function sugerirTareasRelacionadas(tarea, tareas, relaciones, max = 2) {
  const taskKey = resolverTaskKeyRelacion(tarea);
  const descartadas = cargarSugerenciasDescartadas();
  const relacionadas = new Set(keysRelacionadosDe(taskKey, relaciones));

  const candidatas = (tareas || [])
    .filter((t) => !sonLaMismaTarea(tarea, t))
    .map((t) => {
      const score = puntajeSugerenciaRelacion(tarea, t);
      const palabrasCompartidas = extraerPalabrasTitulo(tarea).filter((w) =>
        extraerPalabrasTitulo(t).includes(w)
      ).length;
      const mismoDeadline = diasEntreDeadlines(tarea, t) === 0;
      const califica =
        score >= 4 &&
        (palabrasCompartidas >= 1 || (mismoDeadline && score >= 5));

      return { tarea: t, score, califica };
    })
    .filter(({ tarea: t, califica }) => {
      if (!califica) return false;
      const otroKey = resolverTaskKeyRelacion(t);
      if (relacionadas.has(otroKey)) return false;
      const claveDesc = claveSugerenciaDescartada(taskKey, otroKey);
      return !descartadas.has(claveDesc);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ tarea: t }) => t);

  return candidatas;
}

function fusionarRelaciones(listaA, listaB) {
  const map = new Map();
  [...(listaA || []), ...(listaB || [])].forEach((rel) => {
    const norm = normalizarFilaRelacion(rel);
    if (!norm) return;
    map.set(`${norm.task_key_a}|${norm.task_key_b}`, norm);
  });
  return Array.from(map.values());
}

async function cargarRelacionesRemotas() {
  if (!safeSupabaseRelaciones()) return null;
  const url = supabaseRelUrl();
  if (!url) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/robin_task_relations?select=id,task_key_a,task_key_b,created_by,created_at&order=created_at.desc`,
      { headers: supabaseRelHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map(normalizarFilaRelacion).filter(Boolean);
  } catch (e) {
    console.warn("ROBIN: error cargando relaciones remotas", e);
    return null;
  }
}

async function insertarRelacionRemota(keyA, keyB, createdBy) {
  const par = parRelacionOrdenado(keyA, keyB);
  if (!par) return { ok: false, local: null };

  const fila = {
    task_key_a: par[0],
    task_key_b: par[1],
    created_by: String(createdBy || "").trim().toLowerCase(),
    created_at: new Date().toISOString()
  };

  if (safeSupabaseRelaciones()) {
    const url = supabaseRelUrl();
    if (url) {
      try {
        const res = await fetch(`${url}/rest/v1/robin_task_relations`, {
          method: "POST",
          headers: supabaseRelHeaders("return=representation"),
          body: JSON.stringify({
            task_key_a: fila.task_key_a,
            task_key_b: fila.task_key_b,
            created_by: fila.created_by
          })
        });
        if (res.ok) {
          const data = await res.json();
          const remota = normalizarFilaRelacion(Array.isArray(data) ? data[0] : data);
          if (remota) return { ok: true, local: remota };
        } else if (res.status !== 409) {
          console.warn("ROBIN: error insertando relación remota", res.status);
        }
      } catch (e) {
        console.warn("ROBIN: error insertando relación remota", e);
      }
    }
  }

  const locales = cargarRelacionesLocales();
  if (yaEstanRelacionadas(par[0], par[1], locales)) {
    return { ok: true, local: locales.find(
      (r) => r.task_key_a === par[0] && r.task_key_b === par[1]
    ) };
  }
  locales.unshift(fila);
  guardarRelacionesLocales(locales);
  return { ok: true, local: fila };
}

function cargarRelacionesIniciales() {
  return cargarRelacionesLocales();
}

function agregarRelacionALista(lista, fila) {
  const norm = normalizarFilaRelacion(fila);
  if (!norm || yaEstanRelacionadas(norm.task_key_a, norm.task_key_b, lista)) {
    return lista || [];
  }
  return [norm, ...(lista || [])];
}

function filtrarTareasParaRelacionar(tareas, tareaActual, query, relaciones) {
  const taskKey = resolverTaskKeyRelacion(tareaActual);
  const q = String(query || "").trim().toLowerCase();
  const keysRelacionados = new Set(keysRelacionadosDe(taskKey, relaciones));

  return (tareas || [])
    .filter((t) => {
      if (sonLaMismaTarea(tareaActual, t)) return false;
      const otroKey = resolverTaskKeyRelacion(t);
      if (keysRelacionados.has(otroKey)) return false;
      if (!q) return true;
      const titulo = tituloDisplayTarea(t).toLowerCase();
      const marca = (normalizarMarca(t.marca) || "").toLowerCase();
      return titulo.includes(q) || marca.includes(q);
    })
    .slice(0, 12);
}

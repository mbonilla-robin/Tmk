const STORAGE_TAREAS_KEY = "robin_tareas_backup_v1";
const STORAGE_COLA_KEY = "robin_sync_queue_v1";

function cargarTareasLocales() {
  try {
    const raw = getLocalStorageItemSafe(STORAGE_TAREAS_KEY, "[]");
    const lista = JSON.parse(raw);
    if (!Array.isArray(lista)) return [];
    return lista.map(normalizarTareaCampos);
  } catch (e) {
    console.warn("ROBIN: no se pudo cargar backup de tareas", e);
    return [];
  }
}

function guardarTareasLocales(tareas) {
  try {
    const limpias = (tareas || []).map((t) => {
      const copia = { ...t };
      return copia;
    });
    setLocalStorageItemSafe(STORAGE_TAREAS_KEY, JSON.stringify(limpias));
  } catch (e) {
    console.warn("ROBIN: no se pudo guardar backup de tareas", e);
  }
}

function cargarColaSync() {
  try {
    const raw = getLocalStorageItemSafe(STORAGE_COLA_KEY, "[]");
    const cola = JSON.parse(raw);
    return Array.isArray(cola) ? cola : [];
  } catch (e) {
    return [];
  }
}

function guardarColaSync(cola) {
  setLocalStorageItemSafe(STORAGE_COLA_KEY, JSON.stringify(cola || []));
}

function encolarSync(operacion) {
  let cola = cargarColaSync();
  const taskKey = operacion.taskKey || "";
  const tipo = operacion.type || "update";

  if (tipo === "delete" && taskKey) {
    cola = cola.filter((op) => op.taskKey !== taskKey);
  } else {
    cola = cola.filter((op) => !(op.taskKey === taskKey && op.type === tipo));
  }

  cola.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...operacion
  });
  guardarColaSync(cola);
}

function marcarTareaPendiente(tarea) {
  return { ...tarea, _pendingSync: true };
}

function desmarcarTareaPendiente(tarea) {
  if (!tarea || !tarea._pendingSync) return tarea;
  const copia = { ...tarea };
  delete copia._pendingSync;
  return copia;
}

function tareaEsPendienteLocal(t) {
  if (!t) return false;
  if (t._pendingSync) return true;
  const id = String(t.idTarea || "").trim();
  return id.startsWith("STB-");
}

function fusionarTareasRemotasYLocales(remotas, locales) {
  const cola = cargarColaSync();
  const actualizaciones = cola.filter((op) => op.type === "update" || op.type === "create");
  const eliminaciones = new Set(cola.filter((op) => op.type === "delete").map((op) => op.taskKey));

  const remotoFiltrado = (remotas || []).filter((t) => {
    const key = getTaskSelectionKey(t);
    if (eliminaciones.has(key)) return false;

    for (const op of actualizaciones) {
      if (op.taskKey === key) return false;
      const payload = op.payload || {};
      if (payload.marca && marcasCoinciden(t.marca, payload.marca)) {
        const tInfo = String(t.info || "").trim().toLowerCase();
        const infoOriginal = String(payload.originalInfo || "").trim().toLowerCase();
        const infoNueva = String(payload.info || "").trim().toLowerCase();
        if (infoOriginal && tInfo === infoOriginal) return false;
        if (infoNueva && tInfo === infoNueva && op.type === "create") return false;
      }
    }
    return true;
  });

  const mapa = new Map();
  remotoFiltrado.forEach((t) => {
    mapa.set(getTaskSelectionKey(t), desmarcarTareaPendiente(normalizarTareaCampos(t)));
  });

  (locales || []).forEach((t) => {
    if (!tareaEsPendienteLocal(t)) return;
    mapa.set(getTaskSelectionKey(t), normalizarTareaCampos(t));
  });

  return Array.from(mapa.values());
}

function limpiarPendienteEnTareas(tareas, taskKey, payload) {
  return (tareas || []).map((t) => {
    const key = getTaskSelectionKey(t);
    if (key === taskKey) return desmarcarTareaPendiente(t);

    if (payload && payload.marca && marcasCoinciden(t.marca, payload.marca)) {
      const infoLocal = String(t.info || "").trim().toLowerCase();
      const infoPayload = String(payload.info || "").trim().toLowerCase();
      if (infoPayload && infoLocal === infoPayload) {
        return desmarcarTareaPendiente(t);
      }
    }
    return t;
  });
}

function hayPendientesSync() {
  return cargarColaSync().length > 0;
}

async function procesarColaSync() {
  const apiUrl = getConfiguredApiUrl();
  if (!isApiConfigured() || !apiUrl) {
    return { ok: false, processed: 0, remaining: cargarColaSync().length };
  }

  const cola = cargarColaSync();
  if (!cola.length) return { ok: true, processed: 0, remaining: 0 };

  const restantes = [];
  let processed = 0;
  let tareasLocales = cargarTareasLocales();

  for (const op of cola) {
    try {
      const res = await fetchRobinApi(apiUrl, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: JSON.stringify(op.payload)
      });

      let json = null;
      try {
        json = await res.json();
      } catch (parseErr) {
        json = null;
      }

      if (json && json.success === false) {
        restantes.push(op);
        continue;
      }

      processed += 1;
      if (op.taskKey) {
        tareasLocales = limpiarPendienteEnTareas(tareasLocales, op.taskKey, op.payload);
      }
    } catch (e) {
      console.warn("ROBIN: fallo al enviar operación pendiente", op.type, e);
      restantes.push(op);
    }
  }

  guardarColaSync(restantes);
  guardarTareasLocales(tareasLocales);

  return { ok: restantes.length === 0, processed, remaining: restantes.length, tareasLocales };
}

function normalizarTareasDesdeApi(jsonData) {
  const tareasValidas = (jsonData || []).filter((t) => {
    if (!t.info || t.info.toString().trim() === "") return false;
    if (!t.marca || t.marca.toString().trim() === "") return false;
    const cleanId = String(t.idTarea || "").trim().toUpperCase();
    if (cleanId.startsWith("PRESENCE-")) return false;
    const cleanM = t.marca.toString().trim().toLowerCase();
    if (
      cleanM === "pendiente" ||
      cleanM.includes("progreso") ||
      cleanM.includes("seguimiento") ||
      cleanM.includes("revision") ||
      cleanM.includes("pausa") ||
      cleanM.includes("completada") ||
      cleanM === "config_marcas" ||
      cleanM === "presencia"
    ) {
      return false;
    }
    return true;
  });

  const deduplicadas = [];
  const seenKeys = new Set();

  tareasValidas.forEach((t) => {
    const cleanId = t.idTarea ? String(t.idTarea).trim() : "";
    const hasRealId = isValidIdTarea(cleanId);
    const realId = hasRealId ? cleanId : generarIdDeterminista(t);
    const key = `${t.marca || ""}|${t.info || ""}|${t.deadline || ""}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicadas.push(normalizarTareaCampos({
        ...t,
        idTarea: realId
      }));
    }
  });

  return deduplicadas;
}

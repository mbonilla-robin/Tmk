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
    setLocalStorageItemSafe(STORAGE_TAREAS_KEY, JSON.stringify(tareas || []));
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
  const taskKeyOriginal = operacion.taskKeyOriginal || "";
  const tipo = operacion.type || "update";

  if (tipo === "delete") {
    cola = cola.filter((op) => {
      if (op.taskKey === taskKey) return false;
      if (taskKeyOriginal && op.taskKey === taskKeyOriginal) return false;
      return true;
    });
  } else {
    cola = cola.filter((op) => {
      if (op.type === tipo && (op.taskKey === taskKey || (taskKeyOriginal && op.taskKey === taskKeyOriginal))) {
        return false;
      }
      return true;
    });
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

function infoTareaCoincide(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function remotaCorrespondeAPendiente(remota, op) {
  if (!remota || !op) return false;
  const payload = op.payload || {};
  if (!marcasCoinciden(remota.marca, payload.marca)) return false;

  const rInfo = String(remota.info || "").trim().toLowerCase();
  const infoNueva = String(payload.info || "").trim().toLowerCase();
  const infoOriginal = String(payload.originalInfo || "").trim().toLowerCase();

  if (infoNueva && rInfo === infoNueva) return true;
  if (infoOriginal && rInfo === infoOriginal) return true;
  return false;
}

function remotaCorrespondeATareaLocal(remota, local, cola) {
  if (!remota || !local) return false;
  if (!marcasCoinciden(remota.marca, local.marca)) return false;
  if (infoTareaCoincide(remota.info, local.info)) return true;

  const idLocal = idTareaParaApi(local);
  const idRemota = String(remota.idTarea || "").trim();
  if (idLocal && idRemota && idLocal === idRemota) return true;

  for (const op of cola) {
    if (remotaCorrespondeAPendiente(remota, op)) {
      const payload = op.payload || {};
      if (infoTareaCoincide(local.info, payload.info)) return true;
      if (infoTareaCoincide(local.info, payload.originalInfo)) return true;
    }
  }
  return false;
}

function fusionarTareasRemotasYLocales(remotas, locales) {
  const cola = cargarColaSync();
  const actualizaciones = cola.filter((op) => op.type === "update" || op.type === "create");
  const eliminaciones = new Set(
    cola
      .filter((op) => op.type === "delete")
      .flatMap((op) => [op.taskKey, op.taskKeyOriginal].filter(Boolean))
  );

  const remotoFiltrado = (remotas || []).filter((t) => {
    const key = getTaskSelectionKey(t);
    if (eliminaciones.has(key)) return false;

    for (const op of actualizaciones) {
      if (op.taskKey === key || op.taskKeyOriginal === key) return false;
      if (remotaCorrespondeAPendiente(t, op)) return false;
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

  (locales || []).forEach((local) => {
    if (!tareaEsPendienteLocal(local)) return;
    const remota = (remotas || []).find((r) => remotaCorrespondeATareaLocal(r, local, cola));
    if (remota) {
      mapa.set(getTaskSelectionKey(local), desmarcarTareaPendiente(normalizarTareaCampos({
        ...local,
        ...remota,
        idTarea: remota.idTarea || local.idTarea,
        detalles: local.detalles || remota.detalles
      })));
    }
  });

  return Array.from(mapa.values());
}

function hayPendientesSync() {
  return cargarColaSync().length > 0;
}

function hayTareasPendientesLocales(tareas) {
  return (tareas || []).some(tareaEsPendienteLocal);
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
    } catch (e) {
      console.warn("ROBIN: fallo al enviar operación pendiente", op.type, e);
      restantes.push(op);
    }
  }

  guardarColaSync(restantes);
  return { ok: restantes.length === 0, processed, remaining: restantes.length };
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

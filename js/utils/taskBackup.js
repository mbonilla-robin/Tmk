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
    if (!Array.isArray(cola)) return [];
    return cola.map(normalizarOperacionSyncCola);
  } catch (e) {
    return [];
  }
}

function normalizarPayloadSyncMarca(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const marcaSheet = marcaParaSheet(payload.marca);
  if (!marcaSheet || marcaSheet === payload.marca) return payload;
  return { ...payload, marca: marcaSheet };
}

function normalizarOperacionSyncCola(op) {
  if (!op?.payload) return op;
  return { ...op, payload: normalizarPayloadSyncMarca(op.payload) };
}

function guardarColaSync(cola) {
  setLocalStorageItemSafe(STORAGE_COLA_KEY, JSON.stringify(cola || []));
}

function repararColaSyncMarcas() {
  try {
    const raw = getLocalStorageItemSafe(STORAGE_COLA_KEY, "[]");
    const cola = JSON.parse(raw);
    if (!Array.isArray(cola) || !cola.length) return;
    guardarColaSync(cola.map(normalizarOperacionSyncCola));
  } catch (e) {
    /* ignore */
  }
}

function construirPayloadSyncTarea(original, actualizada, opciones = {}) {
  const orig = original || actualizada || {};
  const act = actualizada || original || {};
  const campoSync = opciones.campoSync || "todo";
  const inicio = normalizarDeadline(
    act.fechaInicio || orig.fechaInicio || resolverFechaInicioTarea(act) || ""
  );

  const payload = {
    marca: marcaParaSheet(act.marca || orig.marca),
    idTarea: idTareaParaApi(orig) || idTareaParaApi(act) || "",
    info: act.info || orig.info,
    originalInfo: orig.info || act.info,
    originalCategoria: orig.categoria || "",
    categoria: act.categoria || orig.categoria,
    personas: act.personas || orig.personas,
    detalles: act.detalles || orig.detalles,
    estado: normalizarEstado(act.estado || orig.estado),
    deadline: normalizarDeadline(act.deadline || orig.deadline),
    prioridad: normalizarPrioridad(act.prioridad || orig.prioridad),
    campo: campoSync,
    esActualizacion: !opciones.esNuevo
  };

  if (inicio) payload.fechaInicio = inicio;

  if (opciones.campoSync === "estado" && opciones.valor !== undefined) {
    payload.estado = normalizarEstado(opciones.valor);
    payload.valor = payload.estado;
  } else if (opciones.campoSync === "deadline" && opciones.valor !== undefined) {
    payload.deadline = normalizarDeadline(opciones.valor);
    payload.valor = payload.deadline;
  } else if (opciones.campoSync === "prioridad" && opciones.valor !== undefined) {
    payload.prioridad = normalizarPrioridad(opciones.valor);
    payload.valor = payload.prioridad;
  } else if (opciones.campoSync === "fechaInicio" && opciones.valor !== undefined) {
    payload.fechaInicio = normalizarDeadline(opciones.valor);
    payload.valor = payload.fechaInicio;
  }

  if (opciones.esNuevo) {
    payload.esActualizacion = false;
    payload.esNuevo = true;
  }

  return payload;
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
  if (!id.startsWith("STB-")) return false;
  const key = getTaskSelectionKey(t);
  return cargarColaSync().some((op) => op.taskKey === key || op.taskKeyOriginal === key);
}

function tareaCoincideConOperacionSync(tarea, op) {
  if (!tarea || !op) return false;
  const keys = [op.taskKey, op.taskKeyOriginal].filter(Boolean);
  const key = getTaskSelectionKey(tarea);
  if (keys.includes(key)) return true;

  const payload = op.payload || {};
  if (!marcasCoinciden(tarea.marca, payload.marca)) return false;
  if (infoTareaCoincide(tarea.info, payload.info)) return true;
  if (infoTareaCoincide(tarea.info, payload.originalInfo)) return true;
  return false;
}

function confirmarTareaLocalTrasSync(op, respuesta) {
  const idRemoto = String(respuesta?.idTarea || "").trim();
  const tareas = cargarTareasLocales();
  let cambio = false;

  const actualizadas = tareas.map((tarea) => {
    if (!tareaCoincideConOperacionSync(tarea, op)) return tarea;

    let next = desmarcarTareaPendiente(normalizarTareaCampos(tarea));
    if (idRemoto && !idRemoto.startsWith("STB-")) {
      next = { ...next, idTarea: idRemoto };
    }
    if (next._localFechas) {
      const limpia = limpiarFechasLocalesSiConfirmadas(next, next);
      next = desmarcarTareaPendiente(limpia);
    }
    cambio = true;
    return next;
  });

  if (cambio) guardarTareasLocales(actualizadas);
  return cambio;
}

function reconciliarTareasLocalesConRemotas(remotas) {
  const listaRemotas = remotas || [];
  const tareas = cargarTareasLocales();
  if (!tareas.length || !listaRemotas.length) return tareas;

  const cola = cargarColaSync();
  let cambio = false;

  const actualizadas = tareas.map((local) => {
    const idLocal = String(local.idTarea || "").trim();
    const pendiente = local._pendingSync || idLocal.startsWith("STB-");
    if (!pendiente) return local;

    const remota = listaRemotas.find((r) => remotaCorrespondeATareaLocal(r, local, cola));
    if (!remota) return local;

    const idRemoto = String(remota.idTarea || "").trim();
    if (!idRemoto || idRemoto.startsWith("STB-")) return local;

    cambio = true;
    const fusionada = normalizarTareaCampos({
      ...local,
      ...remota,
      idTarea: idRemoto,
      detalles: local.detalles || remota.detalles
    });
    return desmarcarTareaPendiente(limpiarFechasLocalesSiConfirmadas(fusionada, remota));
  });

  if (cambio) guardarTareasLocales(actualizadas);
  return cambio ? actualizadas : tareas;
}

function calcularHayPendientesLocales(tareas) {
  const lista = tareas || cargarTareasLocales();
  return hayPendientesSync() || hayTareasPendientesLocales(lista);
}

function infoTareaCoincide(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function remotaCorrespondeAPendiente(remota, op) {
  if (!remota || !op) return false;
  const payload = op.payload || {};
  if (!marcasCoinciden(remota.marca, payload.marca)) return false;

  const remotaId = String(remota.idTarea || "").trim();
  const payloadId = String(payload.idTarea || "").trim();
  if (payloadId && remotaId && payloadId === remotaId) return true;

  const rInfo = String(remota.info || "").trim().toLowerCase();
  const infoNueva = String(payload.info || "").trim().toLowerCase();
  const infoOriginal = String(payload.originalInfo || "").trim().toLowerCase();

  if (infoNueva && rInfo === infoNueva) return true;
  if (infoOriginal && rInfo === infoOriginal) return true;
  return false;
}

function remotaCorrespondeATareaLocal(remota, local, cola) {
  if (!remota || !local) return false;
  if (sonLaMismaTarea(remota, local, { estricto: false })) return true;

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

function elegirFechaLocal(remota, local, campo) {
  const pin = local?._localFechas?.[campo];
  if (pin) {
    const remotaNorm = normalizarDeadline(remota);
    if (!remotaNorm || remotaNorm !== pin) return pin;
  }
  const l = normalizarDeadline(local?.[campo]);
  const r = normalizarDeadline(remota);
  if (l && r && l !== r) return l;
  return l || r || "";
}

function fusionarFechasLocales(remota, local) {
  return {
    deadline: elegirFechaLocal(remota?.deadline, local, "deadline"),
    fechaInicio: elegirFechaLocal(remota?.fechaInicio, local, "fechaInicio")
  };
}

function remotaContradiceFechasLocales(remota, local) {
  if (!local?._localFechas || !remota) return false;
  const pin = local._localFechas;
  if (pin.deadline && normalizarDeadline(remota.deadline) !== pin.deadline) return true;
  if (pin.fechaInicio && normalizarDeadline(remota.fechaInicio) !== pin.fechaInicio) return true;
  return false;
}

function combinarLocalesParaFusion(prevTareas, almacenadas) {
  const resultado = [...(almacenadas || [])];

  (prevTareas || []).forEach((tarea) => {
    const indice = resultado.findIndex((existente) => sonLaMismaTarea(existente, tarea, { estricto: false }));
    if (indice === -1) {
      resultado.push(tarea);
      return;
    }

    const existente = resultado[indice];
    const preferida = (tarea._localFechas || tarea._pendingSync)
      ? tarea
      : (existente._localFechas || existente._pendingSync ? existente : tarea);
    const otra = preferida === tarea ? existente : tarea;
    const fechas = fusionarFechasLocales(otra, preferida);

    resultado[indice] = aplicarFechasLocales(normalizarTareaCampos({
      ...existente,
      ...preferida,
      ...fechas,
      _localFechas: preferida._localFechas || existente._localFechas,
      _pendingSync: !!(preferida._pendingSync || existente._pendingSync)
    }));
  });

  return resultado;
}

function deduplicarTareasFusionadas(lista) {
  const resultado = [];

  (lista || []).forEach((tarea) => {
    const indice = resultado.findIndex((existente) => sonLaMismaTarea(existente, tarea, { estricto: false }));
    if (indice === -1) {
      resultado.push(tarea);
      return;
    }

    const existente = resultado[indice];
    const tienePrioridadLocal = (t) => tareaEsPendienteLocal(t) || tareaTieneFechasLocalesPendientes(t);
    const preferida = tienePrioridadLocal(tarea)
      ? tarea
      : (tienePrioridadLocal(existente) ? existente : tarea);
    const otra = preferida === tarea ? existente : tarea;
    const fechas = fusionarFechasLocales(otra, preferida);
    const fusionada = normalizarTareaCampos({
      ...existente,
      ...preferida,
      ...fechas,
      _localFechas: preferida._localFechas || existente._localFechas,
      idTarea: preferida.idTarea || existente.idTarea,
      detalles: preferida.detalles || existente.detalles
    });

    const confirmada = fechasLocalesConfirmadasConRemota(preferida, otra);
    const fusionFinal = limpiarFechasLocalesSiConfirmadas(fusionada, otra);
    resultado[indice] = tienePrioridadLocal(preferida) && !confirmada
      ? marcarTareaPendiente(fusionFinal)
      : desmarcarTareaPendiente(fusionFinal);
  });

  return resultado;
}

function remotaDebeOcultarseDuranteSync(remota, cola, locales) {
  const key = getTaskSelectionKey(remota);
  const actualizaciones = cola.filter((op) => op.type === "update" || op.type === "create");

  for (const op of actualizaciones) {
    if (op.taskKey === key || op.taskKeyOriginal === key) return true;
    if (remotaCorrespondeAPendiente(remota, op)) return true;
  }

  for (const local of locales || []) {
    if (!sonLaMismaTarea(remota, local, { estricto: false })) continue;
    if (tareaEsPendienteLocal(local)) return true;
    if (remotaContradiceFechasLocales(remota, local)) return true;
  }

  return false;
}

function fusionarTareasRemotasYLocales(remotas, locales) {
  const cola = cargarColaSync();
  const localesConPins = (locales || []).map((t) => aplicarFechasLocales(t));
  const eliminaciones = new Set(
    cola
      .filter((op) => op.type === "delete")
      .flatMap((op) => [op.taskKey, op.taskKeyOriginal].filter(Boolean))
  );

  const remotoFiltrado = (remotas || []).filter((t) => {
    const key = getTaskSelectionKey(t);
    if (eliminaciones.has(key)) return false;
    return !remotaDebeOcultarseDuranteSync(t, cola, localesConPins);
  });

  const mapa = new Map();
  remotoFiltrado.forEach((t) => {
    mapa.set(getTaskSelectionKey(t), desmarcarTareaPendiente(normalizarTareaCampos(t)));
  });

  localesConPins.forEach((t) => {
    if (!tareaEsPendienteLocal(t) && !tareaTieneFechasLocalesPendientes(t)) return;
    mapa.set(getTaskSelectionKey(t), normalizarTareaCampos(t));
  });

  localesConPins.forEach((local) => {
    if (!tareaEsPendienteLocal(local) && !tareaTieneFechasLocalesPendientes(local)) return;
    const remota = (remotas || []).find((r) => remotaCorrespondeATareaLocal(r, local, cola));
    if (remota) {
      const fechas = fusionarFechasLocales(remota, local);
      const fusionada = normalizarTareaCampos({
        ...remota,
        ...local,
        ...fechas,
        _localFechas: local._localFechas,
        idTarea: remota.idTarea || local.idTarea,
        detalles: local.detalles || remota.detalles
      });
      const confirmada = fechasLocalesConfirmadasConRemota(local, remota);
      const fusionFinal = limpiarFechasLocalesSiConfirmadas(fusionada, remota);
      mapa.set(
        getTaskSelectionKey(local),
        (tareaEsPendienteLocal(local) || tareaTieneFechasLocalesPendientes(local)) && !confirmada
          ? marcarTareaPendiente(fusionFinal)
          : desmarcarTareaPendiente(fusionFinal)
      );
    }
  });

  return deduplicarTareasFusionadas(Array.from(mapa.values()));
}

function hayPendientesSync() {
  return cargarColaSync().length > 0;
}

function hayTareasPendientesLocales(tareas) {
  return (tareas || []).some((t) => tareaEsPendienteLocal(t) || tareaTieneFechasLocalesPendientes(t));
}

async function procesarColaSync() {
  const apiUrl = getConfiguredApiUrl();
  if (!isApiConfigured() || !apiUrl) {
    return { ok: false, processed: 0, remaining: cargarColaSync().length, errores: [] };
  }
  if (!hasRobinApiSession()) {
    return {
      ok: false,
      processed: 0,
      remaining: cargarColaSync().length,
      errores: [],
      sessionMissing: true
    };
  }

  const cola = cargarColaSync();
  if (!cola.length) return { ok: true, processed: 0, remaining: 0, errores: [] };

  const restantes = [];
  const errores = [];
  let processed = 0;

  for (const op of cola) {
    const payload = normalizarPayloadSyncMarca(op.payload);
    let exito = false;
    let ultimoError = "Error desconocido";

    for (let intento = 1; intento <= 3; intento++) {
      try {
        const res = await fetchRobinApi(apiUrl, {
          method: "POST",
          mode: "cors",
          redirect: "follow",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          body: JSON.stringify(payload)
        });

        const rawText = await res.text();
        let json = null;
        try {
          json = JSON.parse(rawText);
        } catch (parseErr) {
          json = null;
        }

        if (json && json.success === true) {
          confirmarTareaLocalTrasSync(op, json);
          exito = true;
          processed += 1;
          break;
        }

        ultimoError = (json && json.error) ? String(json.error) : (rawText || `HTTP ${res.status}`).slice(0, 200);
      } catch (e) {
        ultimoError = e?.message || String(e);
      }

      if (intento < 3) {
        await new Promise((resolve) => setTimeout(resolve, intento * 800));
      }
    }

    if (!exito) {
      restantes.push({ ...op, payload });
      errores.push({ type: op.type, taskKey: op.taskKey, error: ultimoError });
      console.warn("ROBIN: no se pudo escribir en el Sheet", op.type, ultimoError);
    }
  }

  guardarColaSync(restantes);
  return { ok: restantes.length === 0, processed, remaining: restantes.length, errores };
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

  tareasValidas.forEach((t) => {
    const normalizada = normalizarTareaCampos({
      ...t,
      idTarea: (() => {
        const cleanId = t.idTarea ? String(t.idTarea).trim() : "";
        return isValidIdTarea(cleanId) ? cleanId : generarIdDeterminista(t);
      })()
    });

    const indice = deduplicadas.findIndex((existente) => sonLaMismaTarea(existente, normalizada, { estricto: false }));
    if (indice === -1) {
      deduplicadas.push(normalizada);
      return;
    }

    const existente = deduplicadas[indice];
    deduplicadas[indice] = normalizarTareaCampos({
      ...existente,
      ...normalizada,
      idTarea: existente.idTarea || normalizada.idTarea
    });
  });

  return deduplicadas;
}

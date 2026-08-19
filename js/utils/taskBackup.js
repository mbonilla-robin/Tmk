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
    const lista = prepararTareasParaAlmacenamiento(tareas);
    setLocalStorageItemSafe(STORAGE_TAREAS_KEY, JSON.stringify(lista));
  } catch (e) {
    console.warn("ROBIN: no se pudo guardar backup de tareas", e);
  }
}

function tareaEstaEnColaSync(tarea, cola) {
  const key = getTaskSelectionKey(tarea);
  return (cola || []).some((op) => op.taskKey === key || op.taskKeyOriginal === key);
}

function prepararTareasParaAlmacenamiento(tareas) {
  return (tareas || []).map((tarea) => ({ ...tarea }));
}

function limpiarPinsLocalesTrasSyncOperacion(tarea, op) {
  let next = desmarcarTareaPendiente(tarea);
  if (!next._localFechas) return next;

  const payload = op?.payload || {};
  const campo = payload.campo || "todo";
  const pin = { ...next._localFechas };
  let touched = false;

  const limpiarCampo = (nombre) => {
    if (pin[nombre]) {
      delete pin[nombre];
      touched = true;
    }
  };

  if (campo === "todo" || campo === "deadline" || payload.deadline !== undefined) limpiarCampo("deadline");
  if (campo === "todo" || campo === "fechaInicio" || payload.fechaInicio !== undefined) limpiarCampo("fechaInicio");

  if (!touched) return next;

  if (!pin.deadline && !pin.fechaInicio) {
    const copia = { ...next };
    delete copia._localFechas;
    return copia;
  }

  return { ...next, _localFechas: pin };
}

function limpiarFlagsSyncObsoletos(tarea, remotas) {
  const cola = cargarColaSync();
  if (tareaEstaEnColaSync(tarea, cola)) return tarea;

  const remota = (remotas || []).find((r) => remotaCorrespondeATareaLocal(r, tarea, cola));
  if (remota && remotaContradiceEdicionLocal(remota, tarea)) {
    return marcarTareaPendiente(normalizarTareaCampos({ ...tarea, estado: tarea.estado }));
  }

  let next = desmarcarTareaPendiente({ ...tarea });
  if (remota) {
    const idRemoto = String(remota.idTarea || "").trim();
    next = limpiarEdicionLocalSiConfirmada({
      ...next,
      idTarea: idRemoto && !idRemoto.startsWith("STB-") ? idRemoto : next.idTarea
    }, remota);
  } else if (!cola.length && next._localFechas) {
    const copia = { ...next };
    delete copia._localFechas;
    next = copia;
  }
  return normalizarTareaCampos(next);
}

function limpiarListaFlagsSyncObsoletos(tareas, remotas) {
  return (tareas || []).map((t) => limpiarFlagsSyncObsoletos(t, remotas));
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

function categoriaSeguraParaSheet(valor, marca) {
  if (String(marca || "").trim() === "Config_Marcas") return String(valor || "").trim();
  const permitidas = ["Reunión", "Solicitud", "Visita PDV", "Ideas", "Otro", "Robin"];
  let raw = String(valor || "").trim();
  if (raw.includes("|")) raw = raw.split("|")[0].trim();
  if (raw.includes(",")) raw = raw.split(",")[0].trim();
  if (typeof categoriaParaSheet === "function") {
    raw = categoriaParaSheet(raw);
  }
  if (permitidas.indexOf(raw) >= 0) return raw;
  const clave = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  if (clave === "reunion") return "Reunión";
  if (clave === "visitapdv" || clave === "pdv" || clave === "visita") return "Visita PDV";
  if (clave === "ideas") return "Ideas";
  if (clave === "robin") return "Robin";
  if (clave === "otro") return "Otro";
  return "Solicitud";
}

function normalizarPayloadSyncMarca(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const marcaSheet = typeof marcaParaSheet === "function" ? marcaParaSheet(payload.marca) : payload.marca;
  const next = { ...payload };
  if (marcaSheet && marcaSheet !== payload.marca) next.marca = marcaSheet;
  next.categoria = categoriaSeguraParaSheet(payload.categoria, next.marca);
  return next;
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

  const idApi = String(orig.idTarea || act.idTarea || "").trim()
    || (typeof idTareaEstableEntregable === "function" ? idTareaEstableEntregable(act) : "")
    || idTareaParaApi(orig)
    || idTareaParaApi(act);

    const info = (typeof entregablesSupabaseListos === "function" && entregablesSupabaseListos())
      ? (act.info || orig.info)
      : (typeof infoTareaUnicaParaSheet === "function"
        ? infoTareaUnicaParaSheet(act)
        : (act.info || orig.info));

    const payload = {
      marca: marcaParaSheet(act.marca || orig.marca),
      idTarea: idApi || "",
      info,
      originalInfo: orig.info || info,
    originalCategoria: orig.categoria || "",
    categoria: categoriaSeguraParaSheet(act.categoria || orig.categoria, act.marca || orig.marca),
    personas: act.personas || orig.personas,
    detalles: act.detalles || orig.detalles,
    estado: normalizarEstado(act.estado || orig.estado),
    deadline: normalizarDeadline(act.deadline || orig.deadline),
    prioridad: normalizarPrioridad(act.prioridad || orig.prioridad),
    campo: campoSync,
    esActualizacion: !opciones.esNuevo && !!idApi
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

  if (typeof obtenerImportKeyTarea === "function") {
    const importKey = obtenerImportKeyTarea(act) || obtenerImportKeyTarea(orig);
    if (importKey) payload.importKey = importKey;
  }

  return payload;
}

function encolarSync(operacion) {
  let cola = cargarColaSync();
  const taskKey = operacion.taskKey || "";
  const taskKeyOriginal = operacion.taskKeyOriginal || "";
  const tipo = operacion.type || "update";
  const importKey = String(operacion?.payload?.importKey || "").trim();

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
      if (tipo === "create" && op.type === "create" && importKey) {
        const opKey = String(op?.payload?.importKey || "").trim();
        if (opKey && opKey === importKey) return false;
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

function limpiarEdicionLocalSiConfirmada(tarea, remota) {
  if (!tareaLocalConfirmadaConRemota(tarea, remota)) return tarea;
  return desmarcarTareaPendiente(limpiarFechasLocalesSiConfirmadas(tarea, remota));
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
  const mismoInfo = infoTareaCoincide(tarea.info, payload.info)
    || infoTareaCoincide(tarea.info, payload.originalInfo);
  if (!mismoInfo) return false;
  return subclientesPayloadCoinciden(tarea, { detalles: payload.detalles, subcliente: payload.subcliente });
}

function confirmarTareaLocalTrasSync(op, respuesta) {
  const idRemoto = String(respuesta?.idTarea || "").trim();
  const tareas = cargarTareasLocales();
  let cambio = false;

  const actualizadas = tareas.map((tarea) => {
    if (!tareaCoincideConOperacionSync(tarea, op)) return tarea;

    let next = normalizarTareaCampos(tarea);
    if (idRemoto && !idRemoto.startsWith("STB-")) {
      next = { ...next, idTarea: idRemoto };
    }
    next = limpiarPinsLocalesTrasSyncOperacion(next, op);
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
    const fechas = fusionarFechasLocales(remota, local);
    const fusionada = normalizarTareaCampos({
      ...remota,
      ...local,
      ...fechas,
      estado: local.estado,
      idTarea: idRemoto,
      detalles: local.detalles || remota.detalles,
      _localFechas: local._localFechas
    });
    if (tareaLocalConfirmadaConRemota(local, remota)) {
      return limpiarEdicionLocalSiConfirmada(fusionada, remota);
    }
    return marcarTareaPendiente(fusionada);
  });

  if (cambio) guardarTareasLocales(actualizadas);
  return cambio ? actualizadas : tareas;
}

function tareaTieneFlagsSyncHuerfanos(tarea) {
  if (!tarea) return false;
  if (tarea._pendingSync) return true;
  return !!(tarea._localFechas?.deadline || tarea._localFechas?.fechaInicio);
}

function repararFlagsSyncSinCola(remotas) {
  if (cargarColaSync().length > 0) return false;
  // Sin datos remotos no podemos confirmar si el flag local sigue vigente.
  if (!Array.isArray(remotas) || !remotas.length) return false;
  const tareas = cargarTareasLocales();
  if (!tareas.length) return false;

  let cambio = false;
  const reparadas = tareas.map((tarea) => {
    if (!tareaTieneFlagsSyncHuerfanos(tarea)) return tarea;
    const next = limpiarFlagsSyncObsoletos(tarea, remotas);
    if (
      !!tarea._pendingSync !== !!next._pendingSync ||
      !!tarea._localFechas !== !!next._localFechas
    ) {
      cambio = true;
    }
    return next;
  });

  if (cambio) guardarTareasLocales(reparadas);
  return cambio;
}

function calcularHayPendientesLocales() {
  repararColaSyncActualizacionesFantasma();
  if (hayPendientesSync()) return true;
  return hayTareasPendientesLocales(cargarTareasLocales());
}

function localTieneEdicionEstadoSinConfirmar(local, remota) {
  if (!local) return false;
  const estLocal = normalizarEstado(local?.estado);
  const estRemota = normalizarEstado(remota?.estado);
  if (!estLocal || !estRemota || estLocal === estRemota) return false;
  return /estado cambiado a\s*"/i.test(String(local.detalles || ""));
}

function localDebeGanarSobreRemota(local, remota, cola) {
  if (!local) return false;
  if (tareaEsPendienteLocal(local) || tareaTieneFechasLocalesPendientes(local)) return true;
  if (tareaEstaEnColaSync(local, cola || cargarColaSync())) return true;
  if (!remota) {
    return /estado cambiado a\s*"/i.test(String(local.detalles || ""));
  }
  return localTieneEdicionEstadoSinConfirmar(local, remota);
}

function infoTareaCoincide(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function subclientesPayloadCoinciden(remota, payloadOTarea) {
  const subR = typeof obtenerSubclienteTarea === "function"
    ? obtenerSubclienteTarea(remota)
    : String(remota?.subcliente || "").trim();
  const subP = typeof obtenerSubclienteTarea === "function"
    ? obtenerSubclienteTarea(payloadOTarea)
    : String(payloadOTarea?.subcliente || "").trim();
  if (!subR && !subP) return true;
  if (typeof subclientesCoinciden === "function") return subclientesCoinciden(subR, subP);
  return String(subR).trim().toLowerCase() === String(subP).trim().toLowerCase();
}

function remotaCorrespondeAPendiente(remota, op) {
  if (!remota || !op) return false;
  const payload = op.payload || {};
  if (!marcasCoinciden(remota.marca, payload.marca)) return false;

  const remotaId = String(remota.idTarea || "").trim();
  const payloadId = String(payload.idTarea || "").trim();
  if (payloadId && remotaId && payloadId === remotaId) return true;

  if (typeof obtenerImportKeyTarea === "function") {
    const keyR = obtenerImportKeyTarea(remota);
    const keyP = obtenerImportKeyTarea({ detalles: payload.detalles, importKey: payload.importKey });
    if (keyR && keyP) return keyR === keyP;
  }

  const rInfo = String(remota.info || "").trim().toLowerCase();
  const infoNueva = String(payload.info || "").trim().toLowerCase();
  const infoOriginal = String(payload.originalInfo || "").trim().toLowerCase();
  const mismoTitulo = (infoNueva && rInfo === infoNueva) || (infoOriginal && rInfo === infoOriginal);
  if (!mismoTitulo) return false;
  return subclientesPayloadCoinciden(remota, { detalles: payload.detalles, subcliente: payload.subcliente });
}

function remotaCorrespondeATareaLocal(remota, local, cola) {
  if (!remota || !local) return false;
  if (sonLaMismaTarea(remota, local, { estricto: false })) return true;

  if (!marcasCoinciden(remota.marca, local.marca)) return false;
  if (infoTareaCoincide(remota.info, local.info)) {
    return subclientesPayloadCoinciden(remota, local);
  }

  const idLocal = idTareaParaApi(local);
  const idRemota = String(remota.idTarea || "").trim();
  if (idLocal && idRemota && idLocal === idRemota) return true;

  for (const op of cola) {
    if (remotaCorrespondeAPendiente(remota, op)) {
      const payload = op.payload || {};
      const mismoInfo = infoTareaCoincide(local.info, payload.info)
        || infoTareaCoincide(local.info, payload.originalInfo);
      if (mismoInfo && subclientesPayloadCoinciden(local, { detalles: payload.detalles, subcliente: payload.subcliente })) {
        return true;
      }
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

function remotaContradiceEdicionLocal(remota, local) {
  if (remotaContradiceFechasLocales(remota, local)) return true;
  if (!remota || !local) return false;
  const estLocal = normalizarEstado(local?.estado);
  const estRemota = normalizarEstado(remota?.estado);
  if (!estLocal || !estRemota || estLocal === estRemota) return false;
  if (tareaEsPendienteLocal(local)) return true;
  if (tareaEstaEnColaSync(local, cargarColaSync())) return true;
  return localTieneEdicionEstadoSinConfirmar(local, remota);
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
    const tienePrioridadLocal = (t, otro) => (
      tareaEsPendienteLocal(t)
      || tareaTieneFechasLocalesPendientes(t)
      || localDebeGanarSobreRemota(t, otro, cargarColaSync())
    );
    const preferida = tienePrioridadLocal(tarea, existente)
      ? tarea
      : (tienePrioridadLocal(existente, tarea) ? existente : tarea);
    const otra = preferida === tarea ? existente : tarea;
    const fechas = fusionarFechasLocales(otra, preferida);
    const fusionada = normalizarTareaCampos({
      ...existente,
      ...preferida,
      ...fechas,
      estado: preferida.estado || existente.estado,
      flujo: preferida.flujo || existente.flujo,
      _localFechas: preferida._localFechas || existente._localFechas,
      idTarea: preferida.idTarea || existente.idTarea,
      detalles: preferida.detalles || existente.detalles
    });

    const confirmada = tareaLocalConfirmadaConRemota(preferida, otra);
    const fusionFinal = limpiarEdicionLocalSiConfirmada(fusionada, otra);
    resultado[indice] = (tienePrioridadLocal(preferida, otra) && !confirmada)
      ? marcarTareaPendiente(fusionFinal)
      : fusionFinal;
  });

  return resultado;
}

function remotaDebeOcultarseDuranteSync(remota, cola, locales) {
  const key = getTaskSelectionKey(remota);
  const actualizaciones = cola.filter((op) => op.type === "update" || op.type === "create");

  for (const op of actualizaciones) {
    if (op.taskKey === key || op.taskKeyOriginal === key) return true;
  }

  for (const local of locales || []) {
    if (!sonLaMismaTarea(remota, local, { estricto: false })) continue;
    if (!localDebeGanarSobreRemota(local, remota, cola)) continue;
    if (remotaCorrespondeATareaLocal(remota, local, cola)) return true;
    if (remotaContradiceEdicionLocal(remota, local)) return true;
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

  let remotoFiltrado = (remotas || []).filter((t) => {
    const key = getTaskSelectionKey(t);
    if (eliminaciones.has(key)) return false;
    return !remotaDebeOcultarseDuranteSync(t, cola, localesConPins);
  });

  const mapa = new Map();
  remotoFiltrado.forEach((t) => {
    const key = getTaskSelectionKey(t);
    const localPendiente = localesConPins.find(
      (l) => localDebeGanarSobreRemota(l, t, cola)
        && remotaCorrespondeATareaLocal(t, l, cola)
    );
    if (localPendiente) return;
    mapa.set(key, desmarcarTareaPendiente(normalizarTareaCampos(t)));
  });

  localesConPins.forEach((t) => {
    const key = getTaskSelectionKey(t);
    if (mapa.has(key)) return;
    const yaRemota = Array.from(mapa.values()).some((r) => sonLaMismaTarea(r, t, { estricto: false }));
    if (yaRemota) return;
    const remotaMatch = (remotas || []).find((r) => sonLaMismaTarea(r, t, { estricto: false }));
    if (!localDebeGanarSobreRemota(t, remotaMatch || null, cola)) return;
    mapa.set(key, normalizarTareaCampos(t));
  });

  localesConPins.forEach((local) => {
    const remota = (remotas || []).find((r) => remotaCorrespondeATareaLocal(r, local, cola));
    if (!remota || !localDebeGanarSobreRemota(local, remota, cola)) return;
    const fechas = fusionarFechasLocales(remota, local);
    const fusionada = normalizarTareaCampos({
      ...remota,
      ...local,
      ...fechas,
      estado: local.estado,
      flujo: local.flujo || remota.flujo,
      _localFechas: local._localFechas,
      idTarea: remota.idTarea || local.idTarea,
      detalles: local.detalles || remota.detalles
    });
    const confirmada = tareaLocalConfirmadaConRemota(local, remota);
    const fusionFinal = limpiarEdicionLocalSiConfirmada(fusionada, remota);
    mapa.set(
      getTaskSelectionKey(local),
      localDebeGanarSobreRemota(local, remota, cola) && !confirmada
        ? marcarTareaPendiente(fusionFinal)
        : fusionFinal
    );
  });

  return deduplicarTareasFusionadas(
    Array.from(mapa.values()).map((t) => (cola.length ? t : limpiarFlagsSyncObsoletos(t, remotas)))
  );
}

function hayPendientesSync() {
  return cargarColaSync().length > 0;
}

function hayTareasPendientesLocales(tareas) {
  return (tareas || []).some((t) => tareaEsPendienteLocal(t) || tareaTieneFechasLocalesPendientes(t));
}

function payloadSyncComoCreacion(payload) {
  const copia = { ...(payload || {}) };
  copia.esActualizacion = false;
  copia.esNuevo = true;
  copia.idTarea = "";
  return copia;
}

function repararColaSyncActualizacionesFantasma() {
  if (typeof entregablesSupabaseListos === "function" && entregablesSupabaseListos()) return false;
  const cola = cargarColaSync();
  let cambio = false;
  const reparada = cola.map((op) => {
    if (op.type !== "update" && op.type !== "create") return op;
    const payload = op.payload || {};
    const id = String(payload.idTarea || "").trim();
    if (payload.esActualizacion && (!id || id.startsWith("STB-"))) {
      cambio = true;
      return { ...op, type: "create", payload: payloadSyncComoCreacion(payload) };
    }
    return op;
  });
  if (cambio) guardarColaSync(reparada);
  return cambio;
}

function compactarColaSync() {
  const tareas = cargarTareasLocales();
  let cola = cargarColaSync().map(normalizarOperacionSyncCola);
  if (!cola.length) return 0;

  cola = cola.filter((op) => {
    if (op.type !== "create") return true;
    if (typeof entregablesSupabaseListos === "function" && entregablesSupabaseListos()) return true;
    const local = tareas.find((t) => tareaCoincideConOperacionSync(t, op));
    if (!local) return true;
    const id = idTareaParaApi(local) || String(local.idTarea || "").trim();
    return !id || id.startsWith("STB-") || id.startsWith("IMP-");
  });

  const vistosImport = new Set();
  const vistosTask = new Map();
  const compacta = [];

  cola.forEach((op) => {
    const payload = op.payload || {};
    const importKey = String(payload.importKey || "").trim()
      || (typeof obtenerImportKeyTarea === "function"
        ? obtenerImportKeyTarea({ detalles: payload.detalles, importKey: payload.importKey })
        : "");
    const taskKey = op.taskKey || op.taskKeyOriginal || "";

    if (op.type === "create" && importKey) {
      if (vistosImport.has(importKey)) return;
      vistosImport.add(importKey);
    }

    if (taskKey && (op.type === "update" || op.type === "create")) {
      const prevIdx = vistosTask.get(`${op.type}:${taskKey}`);
      if (prevIdx != null) {
        compacta[prevIdx] = op;
        return;
      }
      vistosTask.set(`${op.type}:${taskKey}`, compacta.length);
    }

    compacta.push(op);
  });

  guardarColaSync(compacta);
  return compacta.length;
}

async function procesarColaSync(opciones = {}) {
  const limite = Math.max(1, Number(opciones.limite) || 9999);
  compactarColaSync();

  const supabaseListo = typeof entregablesSupabaseListos === "function" && entregablesSupabaseListos();
  const usuarioSync = typeof getRobinApiUsername === "function" ? getRobinApiUsername() : "";
  let processed = 0;
  const errores = [];

  if (supabaseListo && typeof procesarColaEntregablesSupabase === "function") {
    const resultadoSb = await procesarColaEntregablesSupabase(cargarColaSync(), usuarioSync);
    guardarColaSync(resultadoSb.remainingOps || []);
    processed += resultadoSb.processed || 0;
    (resultadoSb.errores || []).forEach((err) => errores.push(err));
  }

  if (supabaseListo && typeof procesarColaWorkspaceSupabase === "function") {
    const resultadoWs = await procesarColaWorkspaceSupabase(cargarColaSync(), usuarioSync);
    guardarColaSync(resultadoWs.remainingOps || []);
    processed += resultadoWs.processed || 0;
    (resultadoWs.errores || []).forEach((err) => errores.push(err));
  }

  if (supabaseListo) {
    const remaining = (cargarColaSync() || []).filter((op) => {
      const id = String(op?.payload?.idTarea || "").trim().toUpperCase();
      return !id.startsWith("PRESENCE-");
    });
    guardarColaSync(remaining);
    if (remaining.length === 0) repararFlagsSyncSinCola();
    return {
      ok: remaining.length === 0,
      processed,
      remaining: remaining.length,
      errores
    };
  }

  const apiUrl = getConfiguredApiUrl();
  if (!isApiConfigured() || !apiUrl) {
    return { ok: false, processed, remaining: cargarColaSync().length, errores };
  }
  if (!hasRobinApiSession()) {
    return {
      ok: false,
      processed,
      remaining: cargarColaSync().length,
      errores,
      sessionMissing: true
    };
  }

  repararColaSyncActualizacionesFantasma();
  const colaCompleta = cargarColaSync();
  if (!colaCompleta.length) return { ok: true, processed: 0, remaining: 0, errores: [] };

  const cola = colaCompleta.slice(0, limite);
  const colaRestante = colaCompleta.slice(limite);

  const restantes = [...colaRestante];

  for (const op of cola) {
    if (typeof operacionColaEsEntregable === "function" && operacionColaEsEntregable(op) && typeof entregablesSupabaseListos === "function" && entregablesSupabaseListos()) {
      restantes.push(op);
      continue;
    }
    let payload = normalizarPayloadSyncMarca(op.payload);
    let exito = false;
    let ultimoError = "Error desconocido";
    let intentoCreacion = false;

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

        if (/validaci[oó]n de datos/i.test(ultimoError) && /celda B/i.test(ultimoError)) {
          payload = { ...payload, categoria: "Solicitud" };
          continue;
        }

        if (!intentoCreacion && /no se encontr[oó]/i.test(ultimoError)) {
          payload = payloadSyncComoCreacion(payload);
          intentoCreacion = true;
          continue;
        }
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
  if (restantes.length === 0) repararFlagsSyncSinCola();
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
      cleanM.includes("suspendido") ||
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

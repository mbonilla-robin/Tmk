const PERSONAS_CANONICAS = [
  "mbonilla",
  "ralvarez",
  "dsalavarria",
  "fcolmenares",
  "gnebrus",
  "mmachado",
  "sgiucastro",
  "dsanchez",
  "admin"
];

const LISTA_PERSONAS_DEFECTO = [
  "@fcolmenares",
  "@ralvarez",
  "@mbonilla",
  "@gnebrus",
  "@mmachado",
  "@dsalavarria",
  "@sgiucastro",
  "@dsanchez",
  "@jalfiero",
  "@arusso",
  "@arodriguez",
  "@agraterol",
  "@dmatheus",
  "@cmujica",
  "Cliente",
  "Trade"
];

const PERSONAS_STORAGE_KEY = "robin_personas_v3";
const PERSONAS_STORAGE_KEY_LEGACY = "robin_personas_v2";

/** Alias @Trade: solo ejecutivos de trade (sin contenido ni diseñadores). */
const PERSONAS_EQUIPO_TRADE = [
  "fcolmenares",
  "ralvarez",
  "mbonilla",
  "gnebrus",
  "mmachado"
];

const PERSONAS_EQUIPO_CONTENIDO = [
  "dsalavarria",
  "sgiucastro",
  "dsanchez"
];

const PERSONAS_ALIAS_A_CANONICO = (() => {
  const map = {};
  const add = (alias, canonico) => {
    map[normalizarClavePersona(alias)] = canonico;
  };

  add("miguel", "mbonilla");
  add("migue", "mbonilla");
  add("bonilla", "mbonilla");
  add("miguel bonilla", "mbonilla");
  add("m bonilla", "mbonilla");
  add("mbonilla", "mbonilla");
  add("@miguel", "mbonilla");
  add("@migue", "mbonilla");
  add("@mbonilla", "mbonilla");

  add("ricardo", "ralvarez");
  add("ricky", "ralvarez");
  add("ric", "ralvarez");
  add("alvarez", "ralvarez");
  add("ricardo alvarez", "ralvarez");
  add("r alvarez", "ralvarez");
  add("ralvarez", "ralvarez");
  add("@ricardo", "ralvarez");
  add("@ricky", "ralvarez");
  add("@ric", "ralvarez");
  add("@ralvarez", "ralvarez");

  add("daniela", "dsalavarria");
  add("dani", "dsalavarria");
  add("salavarria", "dsalavarria");
  add("daniela salavarria", "dsalavarria");
  add("d salavarria", "dsalavarria");
  add("dsalavarria", "dsalavarria");
  add("@daniela", "dsalavarria");
  add("@dani", "dsalavarria");
  add("@dsalavarria", "dsalavarria");

  add("francisco", "fcolmenares");
  add("fran", "fcolmenares");
  add("colmenares", "fcolmenares");
  add("francisco colmenares", "fcolmenares");
  add("fcolmenares", "fcolmenares");
  add("@francisco", "fcolmenares");
  add("@fran", "fcolmenares");
  add("@fcolmenares", "fcolmenares");

  add("genesis", "gnebrus");
  add("gene", "gnebrus");
  add("nebrus", "gnebrus");
  add("genesis nebrus", "gnebrus");
  add("gnebrus", "gnebrus");
  add("@genesis", "gnebrus");
  add("@gene", "gnebrus");
  add("@gnebrus", "gnebrus");

  add("melanie", "mmachado");
  add("meli", "mmachado");
  add("machado", "mmachado");
  add("melanie machado", "mmachado");
  add("m machado", "mmachado");
  add("mmachado", "mmachado");
  add("@melanie", "mmachado");
  add("@meli", "mmachado");
  add("@mmachado", "mmachado");

  add("sofia", "sgiucastro");
  add("sofi", "sgiucastro");
  add("giucastro", "sgiucastro");
  add("sofia giucastro", "sgiucastro");
  add("sgiucastro", "sgiucastro");
  add("@sofia", "sgiucastro");
  add("@sofi", "sgiucastro");
  add("@sgiucastro", "sgiucastro");

  add("douglas", "dsanchez");
  add("doug", "dsanchez");
  add("sanchez", "dsanchez");
  add("douglas sanchez", "dsanchez");
  add("d sanchez", "dsanchez");
  add("dsanchez", "dsanchez");
  add("@douglas", "dsanchez");
  add("@doug", "dsanchez");
  add("@dsanchez", "dsanchez");

  add("admin", "admin");
  add("@admin", "admin");

  add("jalfiero", "jalfiero");
  add("jesus alfiero", "jalfiero");
  add("jesus", "jalfiero");
  add("alfiero", "jalfiero");
  add("@jalfiero", "jalfiero");
  add("@jesus alfiero", "jalfiero");

  add("arusso", "arusso");
  add("alejandro russo", "arusso");
  add("alejandro", "arusso");
  add("russo", "arusso");
  add("@arusso", "arusso");
  add("@alejandro russo", "arusso");

  add("arodriguez", "arodriguez");
  add("angelo rodriguez", "arodriguez");
  add("angelo", "arodriguez");
  add("rodriguez", "arodriguez");
  add("@arodriguez", "arodriguez");
  add("@angelo rodriguez", "arodriguez");

  add("agraterol", "agraterol");
  add("aaron graterol", "agraterol");
  add("aaron", "agraterol");
  add("graterol", "agraterol");
  add("@agraterol", "agraterol");
  add("@aaron graterol", "agraterol");

  add("dmatheus", "dmatheus");
  add("david matheus", "dmatheus");
  add("david", "dmatheus");
  add("matheus", "dmatheus");
  add("@dmatheus", "dmatheus");
  add("@david matheus", "dmatheus");

  add("cmujica", "cmujica");
  add("carlos mujica", "cmujica");
  add("carlos", "cmujica");
  add("mujica", "cmujica");
  add("@cmujica", "cmujica");
  add("@carlos mujica", "cmujica");

  return map;
})();

const PERSONAS_ALIAS_ORDENADOS = Object.keys(PERSONAS_ALIAS_A_CANONICO)
  .sort((a, b) => b.length - a.length);

function resolverMencionEnPosicion(texto, indiceDespuesDeArroba) {
  const raw = String(texto || "");
  const slice = raw.slice(indiceDespuesDeArroba);
  if (!slice) return null;

  const sliceNorm = normalizarClavePersona(slice);

  for (const alias of PERSONAS_ALIAS_ORDENADOS) {
    const aliasNorm = normalizarClavePersona(alias);
    if (!aliasNorm) continue;

    if (sliceNorm.startsWith(aliasNorm)) {
      const nextChar = slice.charAt(aliasNorm.length);
      if (!nextChar || /[\s,;.:!?\n]/.test(nextChar)) {
        const canonico = PERSONAS_ALIAS_A_CANONICO[alias];
        if (!canonico) continue;
        return {
          handle: canonico,
          endIndex: indiceDespuesDeArroba + aliasNorm.length
        };
      }
    }
  }

  const wordMatch = slice.match(/^[^\s@,]+/);
  if (wordMatch) {
    const canonico = resolverHandleCanonico(wordMatch[0]);
    if (canonico) {
      return {
        handle: canonico,
        endIndex: indiceDespuesDeArroba + wordMatch[0].length
      };
    }
  }

  return null;
}

function normalizarClavePersona(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function resolverHandleCanonico(valor) {
  const clave = normalizarClavePersona(valor);
  if (!clave) return "";
  return PERSONAS_ALIAS_A_CANONICO[clave] || "";
}

function esAliasEquipoTrade(valor) {
  return normalizarClavePersona(valor) === "trade";
}

function obtenerHandlesEquipoTrade() {
  return PERSONAS_EQUIPO_TRADE.slice();
}

function expandirTokenPersona(token) {
  if (esAliasEquipoTrade(token)) {
    return obtenerHandlesEquipoTrade();
  }

  const canonico = resolverHandleCanonico(token);
  if (canonico) return [canonico];

  const clave = normalizarClavePersona(token);
  return clave ? [clave] : [];
}

function obtenerHandlesDesdeCampoPersonas(raw) {
  const handles = new Set();
  tokenizarCampoPersonas(raw).forEach((token) => {
    expandirTokenPersona(token).forEach((handle) => handles.add(handle));
  });
  return Array.from(handles);
}

function formatearHandleCanonico(handle) {
  const limpio = normalizarClavePersona(handle);
  if (!limpio) return "";
  return `@${limpio}`;
}

function tokenizarCampoPersonas(raw) {
  const texto = String(raw || "").trim();
  if (!texto) return [];

  if (texto.includes(",")) {
    return texto.split(",").map((t) => t.trim()).filter(Boolean);
  }

  if ((texto.match(/@/g) || []).length > 1) {
    return texto.split(/(?=@)/).map((t) => t.trim()).filter(Boolean);
  }

  if (!texto.includes("@")) {
    const tokens = [];
    let restante = texto;

    while (restante) {
      const claveRestante = normalizarClavePersona(restante);
      let aliasEncontrado = "";

      for (const alias of PERSONAS_ALIAS_ORDENADOS) {
        if (claveRestante === alias || claveRestante.startsWith(`${alias} `)) {
          aliasEncontrado = alias;
          break;
        }
      }

      if (!aliasEncontrado) {
        const partes = restante.split(/\s+/);
        tokens.push(partes[0]);
        restante = partes.slice(1).join(" ").trim();
        continue;
      }

      const numPalabras = aliasEncontrado.split(" ").length;
      const partes = restante.split(/\s+/);
      tokens.push(partes.slice(0, numPalabras).join(" "));
      restante = partes.slice(numPalabras).join(" ").trim();
    }

    return tokens;
  }

  return [texto];
}

function normalizarCampoPersonas(raw) {
  const tokens = tokenizarCampoPersonas(raw);
  if (!tokens.length) return "";

  const vistos = new Set();
  const salida = [];

  const agregarCanonico = (canonico) => {
    if (!canonico || vistos.has(canonico)) return;
    vistos.add(canonico);
    salida.push(formatearHandleCanonico(canonico));
  };

  tokens.forEach((token) => {
    if (esAliasEquipoTrade(token)) {
      obtenerHandlesEquipoTrade().forEach(agregarCanonico);
      return;
    }

    const canonico = resolverHandleCanonico(token);
    if (canonico) {
      agregarCanonico(canonico);
      return;
    }

    const permitida = obtenerEntradaListaPermitida(token);
    if (permitida) {
      const clave = normalizarClavePersona(permitida);
      if (!vistos.has(clave)) {
        vistos.add(clave);
        salida.push(permitida);
      }
      return;
    }

    const limpio = String(token || "").trim();
    if (!limpio) return;
    const clave = normalizarClavePersona(limpio);
    if (!vistos.has(clave)) {
      vistos.add(clave);
      salida.push(limpio.startsWith("@") ? limpio : `@${clave}`);
    }
  });

  return salida.join(", ");
}

function tareaIncluyePersonaFiltro(personasRaw, filtro) {
  const handlesTarea = obtenerHandlesDesdeCampoPersonas(personasRaw);
  if (!handlesTarea.length) return false;

  if (esAliasEquipoTrade(filtro)) {
    const tokens = tokenizarCampoPersonas(personasRaw);
    if (tokens.some(esAliasEquipoTrade)) return true;
    return PERSONAS_EQUIPO_TRADE.every((handle) => handlesTarea.includes(handle));
  }

  const filtroCanonico = resolverHandleCanonico(filtro) || normalizarClavePersona(filtro);
  return handlesTarea.includes(filtroCanonico);
}

function esAliasCliente(valor) {
  return normalizarClavePersona(valor) === "cliente";
}

function entradaCanonicaPersonaEspecial(valor) {
  if (esAliasEquipoTrade(valor)) return "Trade";
  if (esAliasCliente(valor)) return "Cliente";
  return "";
}

function etiquetaDisplayListaPersona(entrada) {
  const especial = entradaCanonicaPersonaEspecial(entrada);
  if (especial) return especial;

  const handle = claveUnicaPersonaLista(entrada);
  if (!handle) return String(entrada || "").trim();

  if (typeof obtenerNombreDisplayEquipo === "function") {
    const nombre = obtenerNombreDisplayEquipo(handle);
    if (nombre && !/^@[\w.]+$/i.test(nombre)) return nombre;
  }

  return entradaCanonicaListaPersona(entrada);
}

function leerListaPersonasGuardada() {
  try {
    const raw = getLocalStorageItemSafe(PERSONAS_STORAGE_KEY, null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function claveUnicaPersonaLista(valor) {
  const canonico = resolverHandleCanonico(valor);
  if (canonico) return canonico;
  return normalizarClavePersona(valor);
}

function entradaCanonicaListaPersona(valor) {
  const entrada = String(valor || "").trim();
  if (!entrada) return "";

  const especial = entradaCanonicaPersonaEspecial(entrada);
  if (especial) return especial;

  const canonico = resolverHandleCanonico(entrada);
  if (canonico) return formatearHandleCanonico(canonico);

  const clave = normalizarClavePersona(entrada);
  return entrada.startsWith("@") ? entrada : `@${clave}`;
}

function fusionarListasPersonas(...listas) {
  const resultado = [];
  const vistos = new Set();

  listas.flat().forEach((persona) => {
    const entradaCanonica = entradaCanonicaListaPersona(persona);
    if (!entradaCanonica) return;

    const clave = claveUnicaPersonaLista(entradaCanonica);
    if (!clave || vistos.has(clave)) return;

    vistos.add(clave);
    resultado.push(entradaCanonica);
  });

  return resultado;
}

function obtenerListaPersonasDefecto() {
  return LISTA_PERSONAS_DEFECTO.slice();
}

function obtenerListaPersonasActiva() {
  return fusionarListasPersonas(
    obtenerListaPersonasDefecto(),
    leerListaPersonasGuardada()
  );
}

function formatearEntradaListaPersona(nombre) {
  const texto = String(nombre || "").trim();
  if (!texto) return "";

  const especial = entradaCanonicaPersonaEspecial(texto);
  if (especial) return especial;

  const canonico = resolverHandleCanonico(texto);
  if (canonico) return formatearHandleCanonico(canonico);

  const enLista = obtenerListaPersonasActiva().find(
    (persona) => claveUnicaPersonaLista(persona) === claveUnicaPersonaLista(texto)
  );
  if (enLista) return enLista;

  const sinArroba = texto.replace(/^@/, "").trim();
  return `@${sinArroba}`;
}

function extraerNombresDesdeMetadataMarca(meta) {
  const entry = normalizarMetadataMarcaEntry(meta);
  const nombres = [];

  [...entry.ejecutivos, ...entry.disenadores, ...entry.contentEquipo].forEach((persona) => {
    const nombre = String(persona.nombre || "").trim();
    if (nombre) nombres.push(nombre);
  });

  return nombres;
}

function extraerNombresDesdeMarcasMetadata(marcasMetadata) {
  if (!marcasMetadata || typeof marcasMetadata !== "object") return [];

  const nombres = [];
  Object.values(marcasMetadata).forEach((meta) => {
    extraerNombresDesdeMetadataMarca(meta).forEach((nombre) => nombres.push(nombre));
  });
  return nombres;
}

function obtenerEntradaListaPermitida(valor) {
  const clave = normalizarClavePersona(valor);
  if (!clave) return "";

  if (clave === "trade") return "Trade";
  if (clave === "cliente") return "Cliente";

  const canonico = resolverHandleCanonico(valor);
  if (canonico) return formatearHandleCanonico(canonico);

  const coincidencia = obtenerListaPersonasActiva().find(
    (persona) => claveUnicaPersonaLista(persona) === claveUnicaPersonaLista(valor)
  );
  return coincidencia || "";
}

function esPersonaPermitidaEnLista(valor) {
  return Boolean(obtenerEntradaListaPermitida(valor));
}

function cargarListaPersonas() {
  const lista = obtenerListaPersonasActiva();
  try {
    setLocalStorageItemSafe(PERSONAS_STORAGE_KEY, JSON.stringify(lista));
    removeLocalStorageItemSafe(PERSONAS_STORAGE_KEY_LEGACY);
  } catch (e) {}
  return lista;
}

function guardarListaPersonas(lista) {
  const fusionada = fusionarListasPersonas(obtenerListaPersonasDefecto(), lista || []);
  try {
    setLocalStorageItemSafe(PERSONAS_STORAGE_KEY, JSON.stringify(fusionada));
  } catch (e) {}
  return fusionada;
}

function registrarPersonasEnLista(listaActual, nombres) {
  const nuevasEntradas = (nombres || [])
    .map(formatearEntradaListaPersona)
    .filter(Boolean);
  return guardarListaPersonas(fusionarListasPersonas(listaActual, nuevasEntradas));
}

function sincronizarListaPersonasConMarcas(listaActual, marcasMetadata) {
  return registrarPersonasEnLista(
    listaActual,
    extraerNombresDesdeMarcasMetadata(marcasMetadata)
  );
}

function normalizarPersonaParaLista(valor) {
  return obtenerEntradaListaPermitida(valor);
}

function partesCampoPersonas(raw) {
  return normalizarCampoPersonas(raw)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function personaEstaSeleccionada(persona, seleccionadas) {
  const lista = Array.isArray(seleccionadas) ? seleccionadas : partesCampoPersonas(seleccionadas);
  const objetivos = partesCampoPersonas(persona);
  if (!objetivos.length) return false;
  return objetivos.every((handle) => lista.includes(handle));
}

function personaCoincideConFiltro(valor, filtro) {
  return tareaIncluyePersonaFiltro(valor, filtro);
}

function filtrarTareasAsignadasADisenador(tareas, username) {
  if (!username || !Array.isArray(tareas)) return tareas || [];
  return tareas.filter((t) => tareaIncluyePersonaFiltro(t.personas || "", username));
}

function obtenerHandlesDisenadores() {
  const base = (typeof ROBIN_DESIGNER_USERNAMES !== "undefined" ? ROBIN_DESIGNER_USERNAMES : []);
  const raw = getLocalStorageItemSafe("robin_lista_disenadores", null);
  let local = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      local = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      local = [];
    }
  }

  const set = new Set([...base, ...local].map((u) => normalizarClavePersona(u)).filter(Boolean));
  return Array.from(set);
}

function obtenerHandlesContenido() {
  const base = (
    typeof ROBIN_CONTENT_USERNAMES !== "undefined"
      ? ROBIN_CONTENT_USERNAMES
      : PERSONAS_EQUIPO_CONTENIDO
  );
  const raw = getLocalStorageItemSafe("robin_lista_contenido", null);
  let local = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      local = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      local = [];
    }
  }

  const set = new Set([...base, ...local].map((u) => normalizarClavePersona(u)).filter(Boolean));
  return Array.from(set);
}

function esPersonaDisenador(valor) {
  const handlesDisenador = new Set(obtenerHandlesDisenadores());
  return obtenerHandlesDesdeCampoPersonas(valor).some((h) => handlesDisenador.has(h));
}

function esPersonaContenido(valor) {
  if (esPersonaDisenador(valor)) return false;
  const handlesContenido = new Set(obtenerHandlesContenido());
  return obtenerHandlesDesdeCampoPersonas(valor).some((h) => handlesContenido.has(h));
}

function obtenerListaEjecutivosActiva() {
  const setDis = new Set(obtenerHandlesDisenadores());
  const setContent = new Set(obtenerHandlesContenido());
  const desdeTrade = obtenerHandlesEquipoTrade()
    .filter((h) => !setDis.has(h) && !setContent.has(h))
    .map(formatearHandleCanonico);
  return fusionarListasPersonas(desdeTrade, ["Trade", "Cliente"]);
}

function obtenerListaContenidoActiva() {
  return fusionarListasPersonas(
    obtenerHandlesContenido().map(formatearHandleCanonico)
  );
}

function obtenerListaDisenadoresActiva() {
  const handlesDisenador = new Set(obtenerHandlesDisenadores());
  const desdeDefecto = LISTA_PERSONAS_DEFECTO.filter((p) => {
    const handle = resolverHandleCanonico(p) || normalizarClavePersona(p);
    return handlesDisenador.has(handle);
  });
  return fusionarListasPersonas(
    ["Trade"],
    obtenerHandlesDisenadores().map(formatearHandleCanonico),
    desdeDefecto
  );
}

function dividirCampoPersonasPorRol(raw) {
  const partes = partesCampoPersonas(raw);
  const ejecutivos = [];
  const contenido = [];
  const disenadores = [];

  partes.forEach((persona) => {
    if (esPersonaDisenador(persona)) {
      disenadores.push(persona);
    } else if (esPersonaContenido(persona)) {
      contenido.push(persona);
    } else {
      ejecutivos.push(persona);
    }
  });

  return {
    ejecutivos: normalizarCampoPersonas(ejecutivos.join(", ")),
    contenido: normalizarCampoPersonas(contenido.join(", ")),
    disenadores: normalizarCampoPersonas(disenadores.join(", "))
  };
}

function combinarRolesPersonas(ejecutivosRaw, contenidoRaw, disenadoresRaw) {
  return normalizarCampoPersonas(
    [ejecutivosRaw, contenidoRaw, disenadoresRaw].filter(Boolean).join(", ")
  );
}

function combinarEjecutivosYDisenadores(ejecutivosRaw, disenadoresRaw) {
  return combinarRolesPersonas(ejecutivosRaw, "", disenadoresRaw);
}

// =============================================================================
// ROBIN — Seguridad API (sin Google OAuth)
// =============================================================================

var ROBIN_OPERACIONES_ADMIN = {
  "crearMarca": true,
  "eliminarMarca": true,
  "actualizarUsuarios": true
};

function robinJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function robinErrorResponse_(message, code) {
  return robinJsonResponse_({
    success: false,
    error: String(message || "No autorizado"),
    code: code || "UNAUTHORIZED"
  });
}

function robinObtenerToken_(e, payload) {
  if (e && e.parameter && e.parameter.token) {
    return String(e.parameter.token).trim();
  }
  if (payload && payload.token) {
    return String(payload.token).trim();
  }
  return "";
}

function robinObtenerUsuario_(e, payload) {
  if (e && e.parameter && e.parameter.robinUser) {
    return String(e.parameter.robinUser).trim().toLowerCase();
  }
  if (payload && payload.robinUser) {
    return String(payload.robinUser).trim().toLowerCase();
  }
  return "";
}

function robinLimpiarPayload_(payload) {
  if (!payload || typeof payload !== "object") return payload;
  var copy = JSON.parse(JSON.stringify(payload));
  delete copy.token;
  delete copy.robinUser;
  return copy;
}

function robinListaDesdePropiedad_(key, fallback) {
  var raw = PropertiesService.getScriptProperties().getProperty(key) || fallback || "";
  return raw.split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}

function robinUsuarioAutorizado_(username) {
  var user = String(username || "").trim().toLowerCase();
  if (!user) return false;
  if (robinEsDisenadorUsuario_(user)) return true;
  var allowed = robinListaDesdePropiedad_(
    "ROBIN_ALLOWED_USERS",
    "fcolmenares,ralvarez,dsalavarria,mbonilla,gnebrus,sgiucastro,jalfiero,arusso,arodriguez,agraterol,dmatheus,admin"
  );
  return allowed.indexOf(user) !== -1;
}

function robinEsDisenadorUsuario_(username) {
  var user = String(username || "").trim().toLowerCase();
  var designers = robinListaDesdePropiedad_(
    "ROBIN_DESIGNER_USERS",
    "jalfiero,arusso,arodriguez,agraterol,dmatheus"
  );
  return designers.indexOf(user) !== -1;
}

function robinAliasDisenador_(username) {
  var map = {
    "jalfiero": ["jalfiero", "jesus alfiero", "jesus", "alfiero"],
    "arusso": ["arusso", "alejandro russo", "alejandro", "russo"],
    "arodriguez": ["arodriguez", "angelo rodriguez", "angelo", "rodriguez"],
    "agraterol": ["agraterol", "aaron graterol", "aaron", "graterol"],
    "dmatheus": ["dmatheus", "david matheus", "david", "matheus"]
  };
  return map[String(username || "").trim().toLowerCase()] || [String(username || "").trim().toLowerCase()];
}

function robinNormalizarPersonasBusqueda_(raw) {
  return String(raw || "").trim().toLowerCase()
    .replace(/^@/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function robinTareaAsignadaADisenador_(personasRaw, username) {
  var personas = robinNormalizarPersonasBusqueda_(personasRaw);
  if (!personas) return false;
  var aliases = robinAliasDisenador_(username);
  for (var i = 0; i < aliases.length; i++) {
    if (personas.indexOf(aliases[i]) !== -1) return true;
  }
  return false;
}

function robinEsAdminUsuario_(username) {
  var user = String(username || "").trim().toLowerCase();
  var admins = robinListaDesdePropiedad_("ROBIN_ADMIN_USERS", "admin");
  return admins.indexOf(user) !== -1;
}

function robinValidarSesionRobin_(e, payload) {
  var token = robinObtenerToken_(e, payload);
  var username = robinObtenerUsuario_(e, payload);
  var secret = PropertiesService.getScriptProperties().getProperty("ROBIN_API_SECRET");
  var designerSecret = PropertiesService.getScriptProperties().getProperty("ROBIN_DESIGNER_API_SECRET") || "robin2026";

  if (!secret) {
    throw new Error("API no configurada: falta ROBIN_API_SECRET en propiedades del script.");
  }
  if (!token) {
    throw new Error("No autorizado: sesión inválida.");
  }
  if (!username) {
    throw new Error("No autorizado: usuario requerido.");
  }
  if (!robinUsuarioAutorizado_(username)) {
    throw new Error("Usuario no autorizado.");
  }

  var isDesigner = robinEsDisenadorUsuario_(username);
  var tokenValido = token === secret || (isDesigner && token === designerSecret);
  if (!tokenValido) {
    throw new Error("No autorizado: sesión inválida.");
  }

  return {
    username: username,
    isAdmin: robinEsAdminUsuario_(username),
    isDesigner: isDesigner
  };
}

function robinExigirOperacionDisenador_(session, payload) {
  if (!session || !session.isDesigner) return;

  var campo = payload && payload.campo ? String(payload.campo).trim() : "";
  if (campo === "eliminar") {
    throw new Error("No autorizado: los diseñadores no pueden eliminar entregables.");
  }
  if (campo === "crearMarca" || campo === "eliminarMarca") {
    throw new Error("No autorizado: operación restringida para diseñadores.");
  }
  if (payload && String(payload.marca || "").trim() === "Config_Marcas") {
    throw new Error("No autorizado: operación restringida para diseñadores.");
  }
  if (payload && payload.esNuevo) {
    throw new Error("No autorizado: los diseñadores no pueden crear entregables.");
  }

  var permitidos = { "detalles": true };
  if (!campo || !permitidos[campo]) {
    throw new Error("No autorizado: los diseñadores solo pueden editar notas y subtareas.");
  }
}

function robinExigirOperacionAdmin_(session, payload) {
  var campo = payload && payload.campo ? String(payload.campo).trim() : "";
  if (campo && ROBIN_OPERACIONES_ADMIN[campo]) {
    if (!session || !session.isAdmin) {
      throw new Error("No autorizado: solo administradores pueden ejecutar '" + campo + "'.");
    }
  }
  if (campo === "eliminar" && payload && String(payload.marca || "").trim() === "Config_Marcas") {
    if (!session || !session.isAdmin) {
      throw new Error("No autorizado: solo administradores pueden modificar configuración.");
    }
  }
  if (payload && String(payload.marca || "").trim() === "Config_Marcas" && campo === "todo") {
    if (!session || !session.isAdmin) {
      throw new Error("No autorizado: solo administradores pueden gestionar enlaces.");
    }
  }
}

function robinActualizarUsuarios_(payload) {
  var usuario = robinNormalizarPersonasBusqueda_(payload.usuario);
  var rol = String(payload.rol || "").trim().toLowerCase();
  var accion = String(payload.accion || "").trim().toLowerCase();

  if (!usuario) throw new Error("Usuario requerido.");
  if (!rol) throw new Error("Rol requerido.");
  if (!accion) throw new Error("Acción requerida.");

  if (rol === "designer" || rol === "disenadores" || rol === "disenador") rol = "disenador";
  if (rol === "executive" || rol === "ejecutivos" || rol === "ejecutivo") rol = "ejecutivo";

  if (rol !== "disenador" && rol !== "ejecutivo") {
    throw new Error("Rol inválido. Usa 'ejecutivo' o 'disenador'.");
  }

  if (usuario === "admin" && accion === "remove") {
    throw new Error("No se puede modificar el usuario 'admin'.");
  }

  var allowed = robinListaDesdePropiedad_(
    "ROBIN_ALLOWED_USERS",
    "fcolmenares,ralvarez,dsalavarria,mbonilla,gnebrus,sgiucastro,admin"
  );
  var designers = robinListaDesdePropiedad_(
    "ROBIN_DESIGNER_USERS",
    "jalfiero,arusso,arodriguez,agraterol,dmatheus"
  );

  var has = function (arr, v) { return arr.indexOf(v) !== -1; };
  var uniq = function (arr) { return Array.from(new Set(arr)); };
  var removeVal = function (arr, v) { return arr.filter(function (x) { return x !== v; }); };

  if (accion === "add") {
    if (rol === "disenador") {
      if (usuario === "admin") throw new Error("admin no puede ser diseñador.");
      if (!has(designers, usuario)) designers.push(usuario);
      allowed = removeVal(allowed, usuario);
    } else {
      if (!has(allowed, usuario)) allowed.push(usuario);
      designers = removeVal(designers, usuario);
    }
  } else if (accion === "remove") {
    if (rol === "disenador") {
      designers = removeVal(designers, usuario);
    } else {
      allowed = removeVal(allowed, usuario);
    }
  } else {
    throw new Error("Acción inválida. Usa 'add' o 'remove'.");
  }

  allowed = uniq(allowed);
  designers = uniq(designers);

  var props = PropertiesService.getScriptProperties();
  props.setProperty("ROBIN_ALLOWED_USERS", allowed.join(","));
  props.setProperty("ROBIN_DESIGNER_USERS", designers.join(","));

  return robinJsonResponse_({ success: true });
}

/** Ejecutar desde el editor: Probar → robinProbarConfiguracion */
function robinProbarConfiguracion() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("ROBIN_API_SECRET");
  Logger.log("ROBIN_API_SECRET configurado: " + (secret ? "SÍ" : "NO"));
  Logger.log("ROBIN_ALLOWED_USERS: " + props.getProperty("ROBIN_ALLOWED_USERS"));
  Logger.log("ROBIN_ADMIN_USERS: " + props.getProperty("ROBIN_ADMIN_USERS"));

  var fakeGet = {
    parameter: {
      token: secret || "",
      robinUser: "mbonilla"
    }
  };

  try {
    var session = robinValidarSesionRobin_(fakeGet, null);
    Logger.log("Prueba OK. Usuario: " + session.username + " | admin: " + session.isAdmin);
  } catch (err) {
    Logger.log("Prueba FALLÓ: " + err);
  }
}

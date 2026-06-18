// =============================================================================
// ROBIN — Seguridad API (sin Google OAuth)
// =============================================================================

var ROBIN_OPERACIONES_ADMIN = {
  "crearMarca": true,
  "eliminarMarca": true
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
  var allowed = robinListaDesdePropiedad_(
    "ROBIN_ALLOWED_USERS",
    "fcolmenares,ralvarez,dsalavarria,mbonilla,gnebrus,sgiucastro,admin"
  );
  return allowed.indexOf(user) !== -1;
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

  if (!secret) {
    throw new Error("API no configurada: falta ROBIN_API_SECRET en propiedades del script.");
  }
  if (!token || token !== secret) {
    throw new Error("No autorizado: sesión inválida.");
  }
  if (!username) {
    throw new Error("No autorizado: usuario requerido.");
  }
  if (!robinUsuarioAutorizado_(username)) {
    throw new Error("Usuario no autorizado.");
  }

  return {
    username: username,
    isAdmin: robinEsAdminUsuario_(username)
  };
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

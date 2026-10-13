// =============================================================================
// ROBIN — Disponibilidad de salas de reunión (Google Calendar)
// =============================================================================
// Despliegue: Implementar → Nueva implementación → Aplicación web
//   Ejecutar como: Yo   |   Quién tiene acceso: Cualquiera
// Debe desplegarse con una cuenta @robin-agency.com que pueda VER las salas.
// Para agregar salas, añade una entrada en SALAS_CALENDARIO (id = valor de `src`
// del link de embed, ya decodificado).
// =============================================================================

var SALAS_SECRETO = "5f551b1389facc9e70c08b79f99c9738";

var SALAS_CALENDARIO = [
  {
    id: "c_188fu48l5lqtei1rikllt40n17sem@resource.calendar.google.com",
    nombre: "Hipódromo"
  }
];

var SALAS_ZONA_HORARIA = "America/Caracas";
var SALAS_OFFSET = "-04:00";
var SALAS_CACHE_SEGUNDOS = 60;
var SALAS_MAX_DIAS = 8;

function salasJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function salasError_(mensaje, codigo) {
  return salasJson_({ success: false, error: String(mensaje), code: codigo || "ERROR" });
}

function salasFechaValida_(texto) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(texto || ""));
}

function salasIso_(fecha) {
  return Utilities.formatDate(fecha, SALAS_ZONA_HORARIA, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function salasHoyCaracas_() {
  return Utilities.formatDate(new Date(), SALAS_ZONA_HORARIA, "yyyy-MM-dd");
}

function salasObtenerCalendario_(id) {
  var cal = CalendarApp.getCalendarById(id);
  if (cal) return cal;
  try {
    return CalendarApp.subscribeToCalendar(id);
  } catch (err) {
    return null;
  }
}

function salasEventosDeSala_(sala, inicio, fin) {
  var cal = salasObtenerCalendario_(sala.id);
  if (!cal) {
    return {
      id: sala.id,
      nombre: sala.nombre,
      error: "Sin acceso al calendario. Comparte la sala con la cuenta que despliega el script."
    };
  }

  var eventos = cal.getEvents(inicio, fin).map(function (ev) {
    var titulo = "";
    try { titulo = ev.getTitle() || ""; } catch (err) { titulo = ""; }
    var creador = "";
    try {
      var creadores = ev.getCreators();
      creador = creadores && creadores.length ? creadores[0] : "";
    } catch (err) { creador = ""; }
    return {
      id: ev.getId(),
      titulo: titulo,
      inicio: salasIso_(ev.getStartTime()),
      fin: salasIso_(ev.getEndTime()),
      todoElDia: ev.isAllDayEvent(),
      creador: creador
    };
  });

  return { id: sala.id, nombre: sala.nombre, eventos: eventos };
}

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (String(params.token || "") !== SALAS_SECRETO) {
      return salasError_("No autorizado", "UNAUTHORIZED");
    }

    var desde = salasFechaValida_(params.desde) ? params.desde : salasHoyCaracas_();
    var hasta = salasFechaValida_(params.hasta) ? params.hasta : desde;

    var inicio = new Date(desde + "T00:00:00" + SALAS_OFFSET);
    var fin = new Date(hasta + "T00:00:00" + SALAS_OFFSET);
    fin.setDate(fin.getDate() + 1);

    var dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000);
    if (isNaN(dias) || dias < 1 || dias > SALAS_MAX_DIAS) {
      return salasError_("Rango inválido (máximo " + SALAS_MAX_DIAS + " días).", "BAD_RANGE");
    }

    var cache = CacheService.getScriptCache();
    var cacheKey = "salas:" + desde + ":" + hasta;
    var enCache = cache.get(cacheKey);
    if (enCache) {
      return ContentService.createTextOutput(enCache).setMimeType(ContentService.MimeType.JSON);
    }

    var salas = SALAS_CALENDARIO.map(function (sala) {
      return salasEventosDeSala_(sala, inicio, fin);
    });

    var respuesta = JSON.stringify({
      success: true,
      zonaHoraria: SALAS_ZONA_HORARIA,
      generado: salasIso_(new Date()),
      desde: desde,
      hasta: hasta,
      salas: salas
    });

    if (respuesta.length < 90000) {
      cache.put(cacheKey, respuesta, SALAS_CACHE_SEGUNDOS);
    }
    return ContentService.createTextOutput(respuesta).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return salasError_(err && err.message ? err.message : err, "SERVER_ERROR");
  }
}

// =============================================================================
// ROBIN — Salas de reunión: copia Google Calendar a Supabase cada 5 minutos
// =============================================================================
// Uso: pega este archivo, elige la función `instalar` y haz clic en Ejecutar.
// Solo hace falta hacerlo una vez, con una cuenta que VEA las salas.
// Para agregar salas, añade una entrada en SALAS_CALENDARIO (id = valor de `src`
// del link de embed, ya decodificado) y vuelve a ejecutar `instalar`.
// =============================================================================

var SALAS_SUPABASE_URL = "https://trzmamlkrzajjcywzpqa.supabase.co";
var SALAS_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyem1hbWxrcnphampjeXd6cHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDk4NjQsImV4cCI6MjEwMTQyNTg2NH0.dxPh6bui-2Sc5gZfV9cnuyA2mzNDA3qHGas0AmNz8qg";
var SALAS_SECRETO = "5f551b1389facc9e70c08b79f99c9738";

var SALAS_CALENDARIO = [
  {
    id: "c_188fu48l5lqtei1rikllt40n17sem@resource.calendar.google.com",
    nombre: "Hipódromo"
  }
];

var SALAS_ZONA_HORARIA = "America/Caracas";
var SALAS_DIAS_ATRAS = 1;
var SALAS_DIAS_ADELANTE = 8;

function salasIso_(fecha) {
  return Utilities.formatDate(fecha, SALAS_ZONA_HORARIA, "yyyy-MM-dd'T'HH:mm:ssXXX");
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

function salasLeerSala_(sala, inicio, fin) {
  var cal = salasObtenerCalendario_(sala.id);
  if (!cal) {
    return {
      id: sala.id,
      nombre: sala.nombre,
      eventos: [],
      error: "Sin acceso al calendario. Comparte la sala con la cuenta que ejecuta el script."
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

  return { id: sala.id, nombre: sala.nombre, eventos: eventos, error: "" };
}

function sincronizarSalas() {
  var hoy = new Date();
  var inicio = new Date(hoy.getTime() - SALAS_DIAS_ATRAS * 86400000);
  inicio.setHours(0, 0, 0, 0);
  var fin = new Date(hoy.getTime() + SALAS_DIAS_ADELANTE * 86400000);

  var salas = SALAS_CALENDARIO.map(function (sala) {
    try {
      return salasLeerSala_(sala, inicio, fin);
    } catch (err) {
      return { id: sala.id, nombre: sala.nombre, eventos: [], error: String(err && err.message ? err.message : err) };
    }
  });

  var respuesta = UrlFetchApp.fetch(SALAS_SUPABASE_URL + "/rest/v1/rpc/robin_salas_sync", {
    method: "post",
    contentType: "application/json",
    headers: {
      apikey: SALAS_SUPABASE_KEY,
      Authorization: "Bearer " + SALAS_SUPABASE_KEY
    },
    payload: JSON.stringify({ p_secret: SALAS_SECRETO, p_salas: salas }),
    muteHttpExceptions: true
  });

  var codigo = respuesta.getResponseCode();
  if (codigo < 200 || codigo >= 300) {
    throw new Error("Supabase respondió " + codigo + ": " + respuesta.getContentText());
  }
  Logger.log("Salas sincronizadas: " + salas.length);
  return salas;
}

function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sincronizarSalas") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sincronizarSalas").timeBased().everyMinutes(5).create();

  var salas = sincronizarSalas();
  salas.forEach(function (s) {
    Logger.log(s.nombre + ": " + (s.error ? "ERROR - " + s.error : s.eventos.length + " reuniones en los próximos días"));
  });
  Logger.log("Listo. Se sincronizará solo cada 5 minutos.");
}

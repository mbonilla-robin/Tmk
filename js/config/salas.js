// Salas de reunión (Google Calendar vía Apps Script: google-apps-script/SalasCalendario.gs)
// Mientras SALAS_API_URL esté vacío, la página usa datos de ejemplo.
const SALAS_API_URL = "";
const SALAS_API_SECRET = "";

// Caracas no usa horario de verano: offset fijo UTC-4.
const SALAS_OFFSET_MIN = -240;
const SALAS_OFFSET_ISO = "-04:00";

const SALAS_HORA_INICIO = 7;
const SALAS_HORA_FIN = 20;

const SALAS_REFRESCO_MS = 60 * 1000;

// Nombres de respaldo (el script devuelve el nombre real de cada sala).
const SALAS_DEMO = [
  { id: "demo-hipodromo", nombre: "Hipódromo" },
  { id: "demo-sala-2", nombre: "Sala 2 (ejemplo)" },
  { id: "demo-sala-3", nombre: "Sala 3 (ejemplo)" }
];

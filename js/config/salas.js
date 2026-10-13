// Salas de reunión: un Apps Script copia Google Calendar a Supabase (tabla robin_salas)
// y ROBIN la lee desde ahí. Ver google-apps-script/SalasCalendario.gs
// "supabase" = datos reales | "demo" = datos de ejemplo
const SALAS_FUENTE = "supabase";

// Si la sincronización lleva más de este tiempo sin actualizarse se avisa en pantalla.
const SALAS_SYNC_ATRASADA_MIN = 15;

// Caracas no usa horario de verano: offset fijo UTC-4.
const SALAS_OFFSET_MIN = -240;
const SALAS_OFFSET_ISO = "-04:00";

const SALAS_HORA_INICIO = 7;
const SALAS_HORA_FIN = 20;

const SALAS_REFRESCO_MS = 60 * 1000;

const SALAS_DEMO = [
  { id: "demo-hipodromo", nombre: "Hipódromo" },
  { id: "demo-sala-2", nombre: "Sala 2 (ejemplo)" },
  { id: "demo-sala-3", nombre: "Sala 3 (ejemplo)" }
];

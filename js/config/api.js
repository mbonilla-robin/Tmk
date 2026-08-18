// Semilla puntual (legado). La app ya no usa Sheets como base; solo se consulta
// una vez si este dispositivo aún no migró widgets/fichas a Supabase.
const AUTO_API_URL = "https://script.google.com/macros/s/AKfycbzd8lCW7XVpO_M2teBGKdsQP8ShHqKAiPORn3a4KjQyGswGpHfaB6HRGw9g3ryow00wrg/exec";

// Intervalo de sincronización automática en segundo plano (ms)
const AUTO_SYNC_INTERVAL_MS = 35 * 1000;

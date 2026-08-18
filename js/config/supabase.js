// Supabase — sincronización de perfil y preferencias entre dispositivos
const SUPABASE_URL = "https://xiaotnensmqmhanfbtlk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYW90bmVuc21xbWhhbmZidGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjU4NDIsImV4cCI6MjA5NzE0MTg0Mn0.gw_BNTkpwsP_6N6oNSY_WoLiG9AN8SVUjH-C-gVMRDw";

// Entregables viven en Robin Hub (el proyecto TMK original está pausado por el límite de free).
const SUPABASE_ENTREGABLES_URL = "https://trzmamlkrzajjcywzpqa.supabase.co";
const SUPABASE_ENTREGABLES_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyem1hbWxrcnphampjeXd6cHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDk4NjQsImV4cCI6MjEwMTQyNTg2NH0.dxPh6bui-2Sc5gZfV9cnuyA2mzNDA3qHGas0AmNz8qg";

function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("your-project")
  );
}

function getSupabaseRestHeaders(prefer, accessToken) {
  const token = accessToken || SUPABASE_ANON_KEY;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

function entregablesSupabaseListos() {
  return Boolean(
    typeof SUPABASE_ENTREGABLES_URL !== "undefined" &&
    SUPABASE_ENTREGABLES_URL &&
    !SUPABASE_ENTREGABLES_URL.includes("your-project") &&
    typeof SUPABASE_ENTREGABLES_ANON_KEY !== "undefined" &&
    SUPABASE_ENTREGABLES_ANON_KEY
  );
}

function backendRobinListo() {
  return entregablesSupabaseListos();
}

window.entregablesSupabaseListos = entregablesSupabaseListos;
window.backendRobinListo = backendRobinListo;

function getEntregablesSupabaseUrl() {
  return typeof SUPABASE_ENTREGABLES_URL !== "undefined" ? SUPABASE_ENTREGABLES_URL : "";
}

function getEntregablesSupabaseHeaders(prefer) {
  const key = typeof SUPABASE_ENTREGABLES_ANON_KEY !== "undefined" ? SUPABASE_ENTREGABLES_ANON_KEY : "";
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

// Supabase — sincronización de perfil y preferencias entre dispositivos
const SUPABASE_URL = "https://xiaotnensmqmhanfbtlk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYW90bmVuc21xbWhhbmZidGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjU4NDIsImV4cCI6MjA5NzE0MTg0Mn0.gw_BNTkpwsP_6N6oNSY_WoLiG9AN8SVUjH-C-gVMRDw";

function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("your-project")
  );
}

function getSupabaseRestHeaders(prefer) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

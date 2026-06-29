import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: "missing_env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const recipient = String(body.recipient || "").replace(/^@/, "").trim().toLowerCase();
  const endpoint = String(body.endpoint || "").trim();
  const p256dh = String(body.p256dh || "").trim();
  const auth = String(body.auth || "").trim();
  const user_agent = String(body.user_agent || "").slice(0, 240);

  if (!recipient || !endpoint || !p256dh || !auth) {
    return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.rpc("robin_upsert_push_subscription", {
    p_recipient: recipient,
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_user_agent: user_agent || null
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, id: data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
});

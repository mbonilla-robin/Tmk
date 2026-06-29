import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const ROBIN_VAPID_PUBLIC = "BAyctUnZFrHN9AF_-VfjndrCZD8Qrnsh3AHrokDY_rVZkOfJGhqibGvo1DLA8732yJ3EcgUnh1KEfxAo9kj2uXw";
const ROBIN_VAPID_PRIVATE = "1oSAPn3kQrfsekRPkW4R18zSeIypWCOs6u33p7AZKLI";
const ROBIN_VAPID_KEY_ID = "v6";
const ROBIN_VAPID_SUBJECT = "mailto:robin@trade.local";

const DISPLAY_NAMES: Record<string, string> = {
  mbonilla: "Miguel Bonilla",
  ralvarez: "Ricardo Álvarez",
  dsalavarria: "Daniela Salavarría",
  fcolmenares: "Francisco Colmenares",
  gnebrus: "Genesis Nebrus",
  sgiucastro: "Sofia Giucastro"
};

type NotifRecord = {
  id?: string;
  recipient?: string;
  type?: string;
  actor?: string;
  task_key?: string;
  marca?: string;
  task_title?: string;
  payload?: Record<string, unknown>;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushSendError = {
  endpoint: string;
  status?: number;
  message: string;
};

function resolveVapidKeys() {
  // Nunca usar secrets de Supabase para VAPID: si el public en secret coincide pero
  // el private es viejo, Apple responde 403 y el push nunca llega al iPhone.
  return {
    publicKey: ROBIN_VAPID_PUBLIC,
    privateKey: ROBIN_VAPID_PRIVATE,
    subject: ROBIN_VAPID_SUBJECT
  };
}

function normalizeUser(val: string) {
  return String(val || "").replace(/^@/, "").trim().toLowerCase();
}

function displayActor(handle: string) {
  const key = normalizeUser(handle).replace(/\./g, "");
  if (DISPLAY_NAMES[key]) return DISPLAY_NAMES[key];
  const limpio = normalizeUser(handle);
  return limpio ? `@${limpio}` : "Alguien";
}

function buildPushContent(notif: NotifRecord) {
  const actor = displayActor(String(notif.actor || ""));
  const payload = (notif.payload || {}) as Record<string, string>;
  const excerpt = String(payload.excerpt || "").trim();
  const taskTitle = String(notif.task_title || "Entregable").trim();
  const type = String(notif.type || "");

  let body = "";
  if (type === "mencion") {
    body = excerpt
      ? `${actor} te dejó este comentario: "${excerpt}"`
      : `${actor} te mencionó en un comentario`;
  } else if (type === "respuesta") {
    body = excerpt
      ? `${actor} respondió tu comentario: "${excerpt}"`
      : `${actor} respondió tu comentario`;
  } else if (type === "asignacion") {
    body = `${actor} te asignó este entregable`;
  } else if (type === "cambio_estado") {
    const de = payload.estadoAnterior || payload.de || "";
    const a = payload.estadoNuevo || payload.a || "";
    body = de && a ? `${actor}: ${de} → ${a}` : `${actor} cambió el estado`;
  } else {
    body = `${actor} te envió una notificación`;
  }

  return {
    title: taskTitle,
    body,
    task_key: notif.task_key || "",
    id: notif.id || "",
    type
  };
}

function extractRecord(body: Record<string, unknown>): NotifRecord | null {
  if (body.record && typeof body.record === "object") {
    return body.record as NotifRecord;
  }
  if (body.type && body.recipient) {
    return body as NotifRecord;
  }
  return null;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
}

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
      headers: corsHeaders()
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: "missing_env" }), {
      status: 500,
      headers: corsHeaders()
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: corsHeaders()
    });
  }

  const notif = extractRecord(body);
  if (!notif || !notif.recipient) {
    return new Response(JSON.stringify({ ok: false, error: "missing_record" }), {
      status: 400,
      headers: corsHeaders()
    });
  }

  const recipient = normalizeUser(String(notif.recipient));
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: subs, error: subsError } = await supabase
    .from("robin_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("recipient", recipient);

  if (subsError) {
    return new Response(JSON.stringify({ ok: false, error: subsError.message }), {
      status: 500,
      headers: corsHeaders()
    });
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, reason: "no_subscriptions" }), {
      status: 200,
      headers: corsHeaders()
    });
  }

  const vapid = resolveVapidKeys();

  try {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: "invalid_vapid", detail: message }), {
      status: 500,
      headers: corsHeaders()
    });
  }

  const pushPayload = buildPushContent(notif);
  const payload = JSON.stringify(pushPayload);

  let sent = 0;
  const staleIds: string[] = [];
  const errors: PushSendError[] = [];

  for (const row of subs as PushSubscriptionRow[]) {
    const isApple = row.endpoint.includes("web.push.apple.com");
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth }
        },
        payload,
        {
          TTL: 60 * 60 * 12,
          urgency: "high",
          ...(isApple ? { contentEncoding: "aes128gcm" as const } : {})
        }
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        endpoint: row.endpoint.slice(0, 80),
        status,
        message: message.slice(0, 240)
      });

      if (status === 404 || status === 410 || status === 403) {
        staleIds.push(row.id);
      }

      console.error("ROBIN push failed", row.endpoint, status, message);
    }
  }

  if (staleIds.length) {
    await supabase.from("robin_push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({
    ok: sent > 0,
    sent,
    failed: errors.length,
    stale: staleIds.length,
    errors,
    vapid_key_id: ROBIN_VAPID_KEY_ID,
    reason: sent > 0 ? "delivered" : (errors.length ? "send_failed" : "no_subscriptions")
  }), {
    status: 200,
    headers: corsHeaders()
  });
});

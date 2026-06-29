import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

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
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:robin@trade.local";

  if (!supabaseUrl || !serviceRoleKey || !vapidPublic || !vapidPrivate) {
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

  const notif = extractRecord(body);
  if (!notif || !notif.recipient) {
    return new Response(JSON.stringify({ ok: false, error: "missing_record" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
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
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_subscriptions" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const pushPayload = buildPushContent(notif);
  const payload = JSON.stringify(pushPayload);

  let sent = 0;
  const staleIds: string[] = [];

  for (const row of subs as PushSubscriptionRow[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth }
        },
        payload,
        { TTL: 60 * 60 * 12 }
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        staleIds.push(row.id);
      }
      console.error("push failed", row.endpoint, err);
    }
  }

  if (staleIds.length) {
    await supabase.from("robin_push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({ ok: true, sent, stale: staleIds.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});

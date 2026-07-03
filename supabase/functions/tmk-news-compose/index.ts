import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    return jsonResponse({ ok: false, error: "GROQ_API_KEY no configurada en Supabase Secrets" }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const pingOnly = body.ping === true;
  const rawInput = String(body.raw_input || body.text || "").trim();
  const authorName = String(body.author_name || "Un miembro del equipo").trim();

  if (pingOnly) {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 16,
        messages: [{ role: "user", content: "Responde solo: OK" }],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return jsonResponse({ ok: false, error: `Groq respondió ${groqRes.status}`, detail: errText.slice(0, 300) }, 502);
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content || "";
    return jsonResponse({ ok: true, secret: "GROQ_API_KEY detectada", groq: "conectado", sample: String(reply).trim() });
  }

  if (!rawInput) {
    return jsonResponse({ ok: false, error: "Falta raw_input" }, 400);
  }

  const systemPrompt = `Eres el redactor de TMK News, el periódico interno del equipo de trade marketing.
Conviertes notas en primera persona en comunicados breves, cálidos y profesionales en español.
Responde SOLO con JSON válido sin markdown, con estas claves:
- title: titular corto (máx 80 caracteres)
- lead: subtítulo de 1-2 líneas para preview (máx 160 caracteres)
- body: párrafo desarrollado de 2-4 oraciones, en tercera persona cuando corresponda
Si hay algo celebratorio (graduación, cumpleaños, logro), añade una línea de felicitación del equipo.
No inventes fechas ni datos que no estén en la nota.`;

  const userPrompt = `Autor: ${authorName}\nNota en crudo:\n${rawInput}`;

  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    return jsonResponse({ ok: false, error: `Groq respondió ${groqRes.status}`, detail: errText.slice(0, 400) }, 502);
  }

  const data = await groqRes.json();
  const content = data?.choices?.[0]?.message?.content || "";

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return jsonResponse({ ok: false, error: "La IA no devolvió JSON válido", raw: content }, 502);
  }

  return jsonResponse({
    ok: true,
    title: String(parsed.title || "").trim(),
    lead: String(parsed.lead || "").trim(),
    body: String(parsed.body || "").trim(),
  });
});

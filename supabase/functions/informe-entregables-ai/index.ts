import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

async function resolveGroqApiKey(): Promise<string> {
  const fromEnv = Deno.env.get("GROQ_API_KEY") || "";
  if (fromEnv) return fromEnv;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return "";

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("robin_app_secrets")
    .select("value")
    .eq("name", "GROQ_API_KEY")
    .maybeSingle();

  if (error || !data?.value) return "";
  return String(data.value);
}

function parseJsonLoose(raw: string): Record<string, unknown> | null {
  const cleaned = String(raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function callGroq(apiKey: string, messages: Array<Record<string, string>>, opts: {
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
} = {}) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.max_tokens ?? 1800,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      messages,
    }),
  });

  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw);
  } catch {
    data = {};
  }

  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      error: `Groq respondió ${res.status}`,
      detail: raw.slice(0, 400),
    };
  }

  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  const content = String(message?.content || "").trim();
  return { ok: true as const, content };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = await resolveGroqApiKey();
  if (!apiKey) {
    return jsonResponse({
      ok: false,
      error: "GROQ_API_KEY no disponible (Secrets o robin_app_secrets)",
    }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mode = String(body.mode || "preparar_informe");

  if (mode === "ping") {
    const result = await callGroq(apiKey, [{ role: "user", content: "Responde solo: OK" }], {
      temperature: 0.1,
      max_tokens: 16,
    });
    if (!result.ok) {
      return jsonResponse({ ok: false, error: result.error, detail: result.detail }, result.status || 502);
    }
    return jsonResponse({
      ok: true,
      secret: "GROQ_API_KEY detectada",
      provider: "groq",
      sample: result.content,
    });
  }

  if (mode === "preparar_informe") {
    const informe = (body.informe || {}) as Record<string, unknown>;
    const marca = String(informe.marca || body.marca || "Gama");
    const periodo = String(body.periodo || "");
    const macros = Array.isArray(informe.macros) ? informe.macros : [];
    const micros = Array.isArray(informe.micros) ? informe.micros : [];
    const sugerenciasNotas = String(informe.sugerenciasNotas || "").trim();

    const compactEjes = (lista: unknown[]) =>
      lista.map((e) => {
        const eje = (e || {}) as Record<string, unknown>;
        return {
          id: eje.id,
          titulo: eje.titulo,
          notas: eje.notas,
          piezas: eje.piezas || eje.trabajos,
          propuestas: eje.propuestas,
          ejecutablesHechos: eje.ejecutablesHechos,
          enEjecucion: eje.enEjecucion,
          fechaFin: eje.fechaFin,
        };
      });

    const systemPrompt = `Eres el redactor senior del área de Trade & Shopper Marketing.
Tu trabajo es convertir las notas del equipo (formulario) en un informe profesional de entregables para el cliente.

Contexto del documento:
- Es un reporte de lo ejecutado en Trade Marketing para la marca indicada.
- Debe comunicar con claridad qué se hizo en piso de venta / temporalidades, con tono corporativo, preciso y colaborativo.
- No es creativo literario ni marketing genérico: es un informe de trabajo realizado.

Responde SOLO con JSON válido (sin markdown) con esta forma exacta:
{
  "macros": [{"id":"...","redactado":"párrafo\\n• bullet\\n• bullet"}],
  "micros": [{"id":"...","redactado":"párrafo\\n• bullet\\n• bullet"}],
  "sugerenciasBullets": [{"icon":"improve|target|chart|spark|users|flag|shield|clock|box|layers","titulo":"Subtítulo corto","text":"Párrafo desarrollado\\n• bullet\\n• bullet"}]
}

Reglas de redacción por eje (macro/micro):
1. LEE con atención "notas", "titulo", piezas, propuestas, ejecutablesHechos y enEjecucion del formulario. Esa es la fuente de verdad.
2. Reescribe en español profesional lo que se hizo: acciones, despliegues, materiales y resultados concretos. Si enEjecucion es true, indícalo como proyecto aún en curso (sin inventar ejecutables realizados).
3. Formato: 1 párrafo inicial (2–4 oraciones) + bullets de acciones/resultados cuando las notas lo ameriten. No resumas de más: conserva la información útil del formulario.
4. NO listes piezas/trabajos en el redactado (van aparte en el PDF). NO inventes métricas, fechas ni entregables que no vengan en los datos.
5. Conserva el "id" de cada eje. Si un eje no tiene notas, redacta un párrafo breve y fiel a título + métricas disponibles, sin inventar.

Reglas de sugerencias de mejora (CRÍTICO — alimentan los próximos pasos):
1. "sugerenciasNotas" es la fuente de verdad. Léelas completas.
2. PROHIBIDO resumir o acortar. Si el equipo escribió ~10 líneas, el resultado debe tener al menos esa extensión (idealmente un poco más: pulir y ampliar ~10–20%).
3. Mejora tipografía, ortografía, gramática y claridad, pero conserva TODO el contenido, matices, bullets y estructura.
4. Cada sugerencia DEBE tener:
   - "titulo": subtítulo corto (3–8 palabras).
   - "text": desarrollo COMPLETO con saltos de línea. Usa \\n entre párrafos y \\n• para cada bullet. NO aplanes todo en un solo párrafo.
   - "icon": elige el SVG más acorde al tema (clock=tiempos/fechas, users=equipos/feedback, shield=calidad/riesgo/stock, target=objetivos/brief, chart=métricas, flag=prioridad/campaña, box=materiales/PDV, improve=mejora general, layers=procesos, spark=idea).
5. Una sugerencia por tema/idea. No fusiones temas distintos. Conserva los bullets del original (pulidos).
6. Si no hay notas, propone 2–3 mejoras generales realistas de Trade Marketing (sin inventar hechos del cliente).

Estilo: claro, directo, corporativo. Evita adjetivos vacíos, emojis y frases de relleno.`;

    const userPrompt = `Prepara el informe de entregables Trade Marketing.

Marca: ${marca}
Periodo: ${periodo || "no indicado"}

Datos de macros (leer notas y métricas de cada uno):
${JSON.stringify(compactEjes(macros), null, 2)}

Datos de micros (leer notas y métricas de cada uno):
${JSON.stringify(compactEjes(micros), null, 2)}

Notas de sugerencias del formulario (base para las mejoras):
${sugerenciasNotas ? JSON.stringify(sugerenciasNotas) : "(sin notas; propone mejoras generales de Trade Marketing alineadas al periodo)"}`;

    const result = await callGroq(
      apiKey,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.35, max_tokens: 6500, json: true },
    );

    if (!result.ok) {
      return jsonResponse({ ok: false, error: result.error, detail: result.detail }, result.status || 502);
    }

    const parsed = parseJsonLoose(result.content);
    if (!parsed) {
      return jsonResponse({ ok: false, error: "La IA no devolvió JSON válido", detail: result.content.slice(0, 400) }, 502);
    }

    return jsonResponse({
      ok: true,
      provider: "groq",
      macros: Array.isArray(parsed.macros) ? parsed.macros : [],
      micros: Array.isArray(parsed.micros) ? parsed.micros : [],
      sugerenciasBullets: Array.isArray(parsed.sugerenciasBullets) ? parsed.sugerenciasBullets : [],
    });
  }

  return jsonResponse({ ok: false, error: `mode no soportado: ${mode}` }, 400);
});

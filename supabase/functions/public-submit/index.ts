import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const captchaToken = String(body?.captchaToken || "");
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : null;

    if (!captchaToken) {
      return jsonResponse({ error: "Falta la verificacion anti-bots." }, 400);
    }
    if (!payload || !String(payload.caseName || "").trim()) {
      return jsonResponse({ error: "Faltan datos obligatorios." }, 400);
    }

    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: getEnv("TURNSTILE_SECRET_KEY"),
        response: captchaToken,
        remoteip: request.headers.get("CF-Connecting-IP") || ""
      })
    });
    const verificationBody = await verification.json();

    if (!verificationBody.success) {
      return jsonResponse({ error: "La verificacion anti-bots no es valida." }, 400);
    }

    const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const now = new Date().toISOString();
    const normalizedPayload = {
      ...payload,
      createdAt: payload.createdAt || now,
      updatedAt: now
    };
    const id = String(normalizedPayload.id || "");

    if (!id) {
      return jsonResponse({ error: "Falta el identificador del formulario." }, 400);
    }

    const { data, error } = await supabase
      .from("app_cases")
      .insert({
        id,
        payload: normalizedPayload,
        created_at: normalizedPayload.createdAt,
        updated_at: now,
        updated_by: null
      })
      .select("payload")
      .single();

    if (error) {
      throw error;
    }

    return jsonResponse({ ok: true, payload: data.payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return jsonResponse({ error: message }, 500);
  }
});

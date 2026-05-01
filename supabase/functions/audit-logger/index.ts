import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  entity_type: z.string().min(1).max(64),
  entity_id: z.string().max(128).optional(),
  action: z.string().min(1).max(64),
  old_data: z.unknown().optional(),
  new_data: z.unknown().optional(),
  reason: z.string().max(500).optional(),
});

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = parsed.data;

    // Get previous hash for chain integrity
    const { data: prev } = await supabase
      .from("audit_log")
      .select("current_hash")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prev_hash = prev?.current_hash ?? "GENESIS";
    const ts = new Date().toISOString();
    const payload = JSON.stringify({
      prev_hash,
      ts,
      user: user.id,
      ...body,
    });
    const current_hash = await sha256(payload);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent") ?? null;

    const { error } = await supabase.from("audit_log").insert({
      user_id: user.id,
      user_email: user.email,
      entity_type: body.entity_type,
      entity_id: body.entity_id ?? null,
      action: body.action,
      old_data: body.old_data ?? null,
      new_data: body.new_data ?? null,
      reason: body.reason ?? null,
      prev_hash,
      current_hash,
      ip_address: ip,
      user_agent: ua,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, hash: current_hash, prev_hash }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

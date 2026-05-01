import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  entity_type: z.string().min(1).max(64),
  entity_id: z.string().min(1).max(128),
  action: z.string().min(1).max(64),
  meaning: z.enum(["approval", "review", "authorship", "responsibility"]),
  reason: z.string().min(3).max(500),
  password: z.string().min(1), // re-auth
  witness_email: z.string().email().optional(),
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
    if (!user || !user.email) {
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

    // Re-authenticate with password (21 CFR Part 11 §11.200)
    const reauth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { error: signErr } = await reauth.auth.signInWithPassword({
      email: user.email,
      password: body.password,
    });

    if (signErr) {
      return new Response(JSON.stringify({ error: "Password verification failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ts = new Date().toISOString();
    const sig_payload = JSON.stringify({
      ts,
      signed_by: user.id,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      action: body.action,
      meaning: body.meaning,
      reason: body.reason,
    });
    const signature_hash = await sha256(sig_payload);

    let witness_id: string | null = null;
    if (body.witness_email) {
      // best-effort lookup; not strictly required
      witness_id = null;
    }

    const { data, error } = await supabase
      .from("e_signatures")
      .insert({
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        action: body.action,
        meaning: body.meaning,
        reason: body.reason,
        signed_by: user.id,
        signed_by_email: user.email,
        witness_id,
        witness_email: body.witness_email ?? null,
        signature_hash,
      })
      .select()
      .single();

    if (error) throw error;

    // Mirror to audit log
    await supabase.from("audit_log").insert({
      user_id: user.id,
      user_email: user.email,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      action: `e-sign:${body.action}`,
      new_data: { meaning: body.meaning, signature_hash },
      reason: body.reason,
      prev_hash: "ESIG",
      current_hash: signature_hash,
    });

    return new Response(JSON.stringify({ ok: true, signature: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

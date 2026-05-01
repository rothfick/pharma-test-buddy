// RAG ingest: chunk text → embeddings (Gemini text-embedding-004, 768-dim) → rag_chunks
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function chunk(text: string, size = 1200, overlap = 150): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return out;
}

async function embed(apiKey: string, texts: string[]): Promise<number[][]> {
  // Use Lovable AI Gateway with Gemini embedding model
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "google/text-embedding-004", input: texts }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`embed ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  return (j.data ?? []).map((d: any) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const auth = req.headers.get("Authorization");
  let userId: string | null = null;
  if (auth?.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(auth.slice(7));
    userId = data.user?.id ?? null;
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: "auth required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { title: string; content: string; source?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.title || !body.content || body.content.length < 20) {
    return new Response(JSON.stringify({ error: "title + content (min 20 chars) required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const t0 = Date.now();
  const { data: doc, error: docErr } = await admin
    .from("rag_documents")
    .insert({ user_id: userId, title: body.title, content: body.content, source: body.source ?? null })
    .select().single();
  if (docErr || !doc) {
    return new Response(JSON.stringify({ error: docErr?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const chunks = chunk(body.content);
  // Embed in batches of 20
  const allEmb: number[][] = [];
  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20);
    try {
      const emb = await embed(apiKey, batch);
      allEmb.push(...emb);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Cleanup doc if embeddings fail
      await admin.from("rag_documents").delete().eq("id", doc.id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const rows = chunks.map((c, idx) => ({
    document_id: doc.id, chunk_index: idx, content: c,
    embedding: allEmb[idx] as any,
  }));
  const { error: chErr } = await admin.from("rag_chunks").insert(rows);
  if (chErr) {
    await admin.from("rag_documents").delete().eq("id", doc.id);
    return new Response(JSON.stringify({ error: chErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    document_id: doc.id, chunks: chunks.length, duration_ms: Date.now() - t0,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

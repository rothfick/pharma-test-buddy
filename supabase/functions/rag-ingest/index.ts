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

// Local deterministic embedding (768-d hashed bag-of-words, L2-normalized).
// Lovable AI Gateway nie udostępnia modeli embeddingowych, więc liczymy lokalnie.
const EMB_DIM = 768;
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function embedOne(text: string): number[] {
  const v = new Float64Array(EMB_DIM);
  const tokens = text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(t => t.length > 1);
  for (const tok of tokens) {
    const h = hash32(tok);
    const idx = h % EMB_DIM;
    const sign = (h >> 31) & 1 ? -1 : 1;
    v[idx] += sign;
  }
  // bigrams for a bit of context
  for (let i = 0; i < tokens.length - 1; i++) {
    const h = hash32(tokens[i] + "_" + tokens[i + 1]);
    v[h % EMB_DIM] += ((h >> 31) & 1 ? -1 : 1) * 0.5;
  }
  let norm = 0;
  for (let i = 0; i < EMB_DIM; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Array(EMB_DIM);
  for (let i = 0; i < EMB_DIM; i++) out[i] = v[i] / norm;
  return out;
}
async function embed(_apiKey: string, texts: string[]): Promise<number[][]> {
  return texts.map(embedOne);
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

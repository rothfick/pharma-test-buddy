// RAG query: embed question → match_rag_chunks → answer with citations via LLM
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Local deterministic embedding (musi być identyczne jak w rag-ingest)
const EMB_DIM = 768;
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
async function embed(_apiKey: string, text: string): Promise<number[]> {
  const v = new Float64Array(EMB_DIM);
  const tokens = text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(t => t.length > 1);
  for (const tok of tokens) {
    const h = hash32(tok);
    const sign = (h >> 31) & 1 ? -1 : 1;
    v[h % EMB_DIM] += sign;
  }
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

  let body: { question: string; doc_ids?: string[]; top_k?: number };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.question || body.question.length < 3) {
    return new Response(JSON.stringify({ error: "question required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const t0 = Date.now();
  let qEmb: number[];
  try { qEmb = await embed(apiKey, body.question); } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: matches, error: mErr } = await admin.rpc("match_rag_chunks", {
    query_embedding: qEmb as any,
    match_count: body.top_k ?? 5,
    filter_doc_ids: body.doc_ids?.length ? body.doc_ids : null,
  });
  if (mErr) {
    return new Response(JSON.stringify({ error: mErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const chunks = (matches ?? []) as Array<{ chunk_id: string; document_id: string; content: string; similarity: number }>;
  const top = chunks[0];
  // Guardrail: brak dobrego matcha
  if (!top || top.similarity < 0.15) {
    await admin.from("llm_traces").insert({
      user_id: userId, feature: "rag_query", model: "guardrail",
      prompt_tokens: 0, completion_tokens: 0, cost_usd: 0,
      latency_ms: Date.now() - t0, status: "success",
      request_preview: body.question.slice(0, 200),
      response_preview: "I don't know (low similarity)",
      metadata: { top_similarity: top?.similarity ?? 0 },
    });
    return new Response(JSON.stringify({
      answer: "Nie znalazłem wystarczająco trafnego fragmentu w bazie wiedzy. Dodaj więcej dokumentów lub doprecyzuj pytanie.",
      citations: [], top_similarity: top?.similarity ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Get doc titles for citations
  const docIds = [...new Set(chunks.map(c => c.document_id))];
  const { data: docs } = await admin.from("rag_documents").select("id,title").in("id", docIds);
  const titleMap = new Map(docs?.map(d => [d.id, d.title]) ?? []);

  const context = chunks.map((c, i) =>
    `[${i + 1}] (źródło: ${titleMap.get(c.document_id) ?? "?"}, sim=${c.similarity.toFixed(3)})\n${c.content}`
  ).join("\n\n---\n\n");

  const model = "google/gemini-3-flash-preview";
  const llmRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Odpowiadaj WYŁĄCZNIE na podstawie podanego kontekstu. Cytuj numerami w nawiasach kwadratowych [1], [2]. Jeśli kontekst nie wystarcza, napisz 'Nie wiem'." },
        { role: "user", content: `Kontekst:\n${context}\n\nPytanie: ${body.question}` },
      ],
    }),
  });
  if (!llmRes.ok) {
    return new Response(JSON.stringify({ error: `LLM ${llmRes.status}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const llmJ = await llmRes.json();
  const answer = llmJ.choices?.[0]?.message?.content ?? "";
  const tokensIn = llmJ.usage?.prompt_tokens ?? 0;
  const tokensOut = llmJ.usage?.completion_tokens ?? 0;
  const cost = +(((tokensIn * 0.15) + (tokensOut * 0.6)) / 1_000_000).toFixed(6);

  await admin.from("llm_traces").insert({
    user_id: userId, feature: "rag_query", model,
    prompt_tokens: tokensIn, completion_tokens: tokensOut, cost_usd: cost,
    latency_ms: Date.now() - t0, status: "success",
    request_preview: body.question.slice(0, 200),
    response_preview: answer.slice(0, 500),
    metadata: { top_similarity: top.similarity, num_chunks: chunks.length },
  });

  return new Response(JSON.stringify({
    answer,
    citations: chunks.map((c, i) => ({
      n: i + 1, document_id: c.document_id, title: titleMap.get(c.document_id),
      similarity: c.similarity, snippet: c.content.slice(0, 200),
    })),
    duration_ms: Date.now() - t0, tokens: tokensIn + tokensOut, cost,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

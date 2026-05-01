// Synthetic data generator for QA fixtures.
// Uses Lovable AI gateway with tool-calling for guaranteed JSON schema.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "tasks" | "users" | "rag_docs";

const SCHEMAS: Record<EntityType, Record<string, unknown>> = {
  tasks: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Concise task title (3-80 chars)" },
            description: { type: "string", description: "1-3 sentence description" },
            status: { type: "string", enum: ["todo", "in_progress", "done"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["title", "description", "status", "priority"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
  users: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            display_name: { type: "string" },
            bio: { type: "string", description: "Short 1-line professional bio" },
            role_hint: { type: "string", enum: ["admin", "manager", "user"] },
          },
          required: ["display_name", "bio", "role_hint"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
  rag_docs: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string", description: "200-400 word document body" },
            source: { type: "string", description: "Fake URL or source name" },
          },
          required: ["title", "content", "source"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPTS: Record<EntityType, string> = {
  tasks: "You generate realistic QA test fixture data for a task management app. Vary statuses and priorities. Make titles and descriptions diverse and plausible.",
  users: "You generate realistic synthetic user profiles for QA test fixtures. Use diverse names from various cultures. Keep bios professional and short.",
  rag_docs: "You generate synthetic knowledge-base documents for RAG QA test fixtures. Each document should be coherent prose, not bullet points. Cover the requested topic.",
};

const EDGE_CASES_HINT = `
Include intentionally tricky values for QA edge-case testing:
- one item with a very long title (>200 chars)
- one item with special characters: emoji, quotes, <html>, SQL-like 'OR 1=1
- one item with a minimal/empty-ish description
- one item with non-ASCII characters (Polish, Chinese, Arabic mix)
- vary lengths dramatically
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth required (we tag inserts with the user id)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "auth_required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return new Response(JSON.stringify({ error: "auth_required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  let body: {
    entity: EntityType;
    count: number;
    scene: string;
    edge_cases?: boolean;
    persist?: boolean;
  };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { entity, scene, edge_cases = false, persist = false } = body;
  const count = Math.max(1, Math.min(50, Number(body.count) || 5));

  if (!["tasks", "users", "rag_docs"].includes(entity)) {
    return new Response(JSON.stringify({ error: "Invalid entity" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userPrompt = `Generate exactly ${count} ${entity} for the following scenario:
"${scene || "general realistic QA fixtures"}".
${edge_cases ? EDGE_CASES_HINT : ""}
Return them via the generate_fixtures tool.`;

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[entity] },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "generate_fixtures",
          description: "Return generated fixture items.",
          parameters: SCHEMAS[entity],
        },
      }],
      tool_choice: { type: "function", function: { name: "generate_fixtures" } },
    }),
  });

  if (!aiResp.ok) {
    const t = await aiResp.text();
    if (aiResp.status === 429 || aiResp.status === 402) {
      return new Response(JSON.stringify({
        error: aiResp.status === 429 ? "rate_limited" : "credits_exhausted",
        message: aiResp.status === 429
          ? "Rate limit exceeded — try again in a moment."
          : "AI credits exhausted — add funds in workspace settings.",
      }), {
        status: aiResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: `AI error: ${t.slice(0, 200)}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const aiJson = await aiResp.json();
  const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return new Response(JSON.stringify({ error: "No tool call returned" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  let parsed: { items: any[] };
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch {
    return new Response(JSON.stringify({ error: "Failed to parse tool args" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const items = (parsed.items ?? []).slice(0, count);

  // Optional persist
  let inserted = 0;
  if (persist && items.length > 0) {
    if (entity === "tasks") {
      const rows = items.map((it: any) => ({
        title: String(it.title ?? "").slice(0, 500) || "Untitled",
        description: it.description ?? null,
        status: ["todo", "in_progress", "done"].includes(it.status) ? it.status : "todo",
        priority: ["low", "medium", "high"].includes(it.priority) ? it.priority : "medium",
        created_by: userId,
      }));
      const { error, count: c } = await supabase.from("tasks").insert(rows, { count: "exact" });
      if (error) {
        return new Response(JSON.stringify({
          error: `Insert failed: ${error.message}`, items,
        }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted = c ?? rows.length;
    } else if (entity === "rag_docs") {
      const rows = items.map((it: any) => ({
        title: String(it.title ?? "").slice(0, 500) || "Untitled",
        content: String(it.content ?? ""),
        source: it.source ?? null,
        user_id: userId,
        metadata: { synthetic: true },
      }));
      const { error, count: c } = await supabase.from("rag_documents").insert(rows, { count: "exact" });
      if (error) {
        return new Response(JSON.stringify({
          error: `Insert failed: ${error.message}`, items,
        }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted = c ?? rows.length;
    } else {
      // users: we don't create real auth users — return generated payload only
      return new Response(JSON.stringify({
        items, inserted: 0,
        note: "User entities are preview-only (no real auth.users created).",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({ items, inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

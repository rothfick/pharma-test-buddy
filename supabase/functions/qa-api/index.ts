const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const delay = Math.min(parseInt(url.searchParams.get("delay") ?? "0") || 0, 10000);
  const fail = parseInt(url.searchParams.get("fail") ?? "0") || 0;

  if (delay > 0) {
    await new Promise((r) => setTimeout(r, delay));
  }

  if (fail >= 400 && fail < 600) {
    return new Response(
      JSON.stringify({
        error: `Forced failure with status ${fail}`,
        timestamp: new Date().toISOString(),
      }),
      {
        status: fail,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: "QA API responded successfully",
      delay_ms: delay,
      timestamp: new Date().toISOString(),
      data: {
        items: [
          { id: 1, name: "Item one" },
          { id: 2, name: "Item two" },
          { id: 3, name: "Item three" },
        ],
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});

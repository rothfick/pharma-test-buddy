// Performance test target — configurable endpoint to benchmark
// Supports query params: ?delay=200&error_rate=0.1&payload_size=1024

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const delay = Math.min(Math.max(parseInt(url.searchParams.get("delay") ?? "0", 10) || 0, 0), 5000);
  const errorRate = Math.min(Math.max(parseFloat(url.searchParams.get("error_rate") ?? "0") || 0, 0), 1);
  const payloadSize = Math.min(Math.max(parseInt(url.searchParams.get("payload_size") ?? "256", 10) || 256, 0), 65536);

  // Simulate variable latency with jitter (±20%)
  const jitter = delay * (Math.random() * 0.4 - 0.2);
  const actualDelay = Math.max(0, Math.round(delay + jitter));
  if (actualDelay > 0) {
    await new Promise((r) => setTimeout(r, actualDelay));
  }

  // Simulate failures
  if (Math.random() < errorRate) {
    return new Response(JSON.stringify({ error: "injected_failure", code: 500 }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate payload
  const payload = {
    ok: true,
    timestamp: Date.now(),
    actual_delay_ms: actualDelay,
    data: "x".repeat(payloadSize),
  };

  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

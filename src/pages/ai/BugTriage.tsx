import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bug, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SAMPLES: Record<string, string> = {
  "Timeout": `Test timeout of 30000ms exceeded.
Error: page.click: Target closed
=========================== logs ===========================
waiting for locator('[data-testid="submit"]')
locator resolved to <button data-testid="submit" disabled>Save</button>
attempting click action
============================================================
    at LoginPage.submit (tests/pages/login.ts:42:18)
    at Context.<anonymous> (tests/login.spec.ts:18:5)`,
  "Network 500": `Error: expect(received).toBe(expected) // Object.is equality
Expected: 200
Received: 500
    at Object.<anonymous> (tests/api/users.spec.ts:24:34)
Response body: {"error":"connection to db timed out","trace_id":"abc123"}`,
  "Stale element": `Error: Element is not attached to the DOM
    at TasksTable.editRow (tests/pages/tasks.ts:88:12)
DOM mutation observed between locator resolution and action.
Test had 2 retries, all failed identically at the same step after page transition.`,
};

interface TriageResult {
  category: "flaky" | "regression" | "environment" | "test_data" | "unknown";
  severity: "low" | "medium" | "high" | "critical";
  root_cause: string;
  suggested_fix: string;
  confidence: number;
  related_areas: string[];
}

const sevColor: Record<string, string> = {
  low: "secondary", medium: "secondary", high: "default", critical: "destructive",
};

export default function BugTriage() {
  const [log, setLog] = useState(SAMPLES["Timeout"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  const triage = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("llm-gateway", {
        body: {
          feature: "bug-triage",
          model: "openai/gpt-5-mini",
          fallbacks: ["google/gemini-3-flash-preview", "google/gemini-2.5-pro"],
          messages: [
            {
              role: "system",
              content:
                "You are a senior QA triage engineer. Classify the failure and propose a fix. Always call the triage_failure function.",
            },
            { role: "user", content: log },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "triage_failure",
                description: "Classify a test failure",
                parameters: {
                  type: "object",
                  properties: {
                    category: {
                      type: "string",
                      enum: ["flaky", "regression", "environment", "test_data", "unknown"],
                    },
                    severity: {
                      type: "string", enum: ["low", "medium", "high", "critical"],
                    },
                    root_cause: { type: "string" },
                    suggested_fix: { type: "string" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    related_areas: { type: "array", items: { type: "string" }, maxItems: 5 },
                  },
                  required: [
                    "category", "severity", "root_cause",
                    "suggested_fix", "confidence", "related_areas",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "triage_failure" } },
        },
      });
      if (error) throw error;
      const call = (data as any)?.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) throw new Error("Model did not return tool call");
      setResult(JSON.parse(call.function.arguments));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Triage failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="ai-bug-triage">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="h-4 w-4" /> Failure log / stacktrace
          </CardTitle>
          <CardDescription>
            Fallback chain: <code>gpt-5-mini → gemini-flash → gemini-pro</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(SAMPLES).map((k) => (
              <Button
                key={k} size="sm" variant="outline"
                onClick={() => setLog(SAMPLES[k])}
                data-testid={`triage-sample-${k}`}
              >
                {k}
              </Button>
            ))}
          </div>
          <Textarea
            value={log}
            onChange={(e) => setLog(e.target.value)}
            rows={14}
            className="font-mono text-xs"
            data-testid="triage-input"
          />
          <Button onClick={triage} disabled={loading} data-testid="triage-run">
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
              : <><Bug className="mr-2 h-4 w-4" /> Triage</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verdict</CardTitle>
          <CardDescription>Strukturalne wyjście (tool calling) — gotowe do zapisu w trackerze.</CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">Wklej log i naciśnij „Triage".</p>
          ) : (
            <div className="space-y-4" data-testid="triage-result">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{result.category}</Badge>
                <Badge variant={sevColor[result.severity] as any}>
                  severity: {result.severity}
                </Badge>
                <Badge variant="outline">
                  confidence {(result.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Root cause</div>
                <p className="text-sm">{result.root_cause}</p>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Suggested fix</div>
                <p className="text-sm">{result.suggested_fix}</p>
              </div>
              {result.related_areas?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Related areas</div>
                  <div className="flex flex-wrap gap-1">
                    {result.related_areas.map((a, i) => (
                      <Badge key={i} variant="secondary">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

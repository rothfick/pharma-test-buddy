import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SAMPLE_DOM = `<form data-testid="login-form" class="space-y-4">
  <div>
    <label for="email-field">Email</label>
    <input id="email-field" type="email" name="email" autocomplete="username" />
  </div>
  <div>
    <label for="pass-field">Password</label>
    <input id="pass-field" type="password" name="password" autocomplete="current-password" />
  </div>
  <button type="submit" id="cta-login" class="btn btn-primary">Sign in</button>
</form>`;

interface HealResult {
  selector: string;
  strategy: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
}

export default function SelfHealing() {
  const [oldSelector, setOldSelector] = useState("#login-button");
  const [intent, setIntent] = useState("Click the sign-in button to submit credentials");
  const [dom, setDom] = useState(SAMPLE_DOM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealResult | null>(null);

  const heal = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("llm-gateway", {
        body: {
          feature: "self-healing",
          model: "google/gemini-3-flash-preview",
          fallbacks: ["google/gemini-2.5-flash"],
          messages: [
            {
              role: "system",
              content:
                "You are a Playwright selector expert. Given a failing selector, the user's intent and the current DOM, propose a robust replacement. Always call the heal_selector function.",
            },
            {
              role: "user",
              content: `Failing selector: ${oldSelector}\nIntent: ${intent}\n\nDOM:\n${dom}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "heal_selector",
                description: "Return a robust replacement selector",
                parameters: {
                  type: "object",
                  properties: {
                    selector: { type: "string", description: "New Playwright selector (CSS or getByTestId('x'))" },
                    strategy: {
                      type: "string",
                      enum: ["data-testid", "role+name", "label", "css-id", "css-class", "text"],
                    },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    reasoning: { type: "string" },
                    alternatives: {
                      type: "array", items: { type: "string" }, maxItems: 3,
                    },
                  },
                  required: ["selector", "strategy", "confidence", "reasoning", "alternatives"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "heal_selector" } },
        },
      });
      if (error) throw error;
      const call = (data as any)?.choices?.[0]?.message?.tool_calls?.[0];
      const args = call?.function?.arguments;
      if (!args) throw new Error("Model did not return a tool call");
      setResult(JSON.parse(args));
      toast.success("Wygenerowano nowy selektor");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Healing failed");
    } finally {
      setLoading(false);
    }
  };

  const confColor = (c: number) =>
    c >= 0.8 ? "default" : c >= 0.5 ? "secondary" : "destructive";

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="ai-self-healing">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" /> Failing selector + DOM
          </CardTitle>
          <CardDescription>
            Structured output via tool calling — gwarantowany JSON zgodny ze schematem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Stary selektor</label>
            <Input
              value={oldSelector}
              onChange={(e) => setOldSelector(e.target.value)}
              data-testid="heal-old"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Intencja użytkownika</label>
            <Input
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              data-testid="heal-intent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Aktualny DOM (HTML snapshot)</label>
            <Textarea
              value={dom}
              onChange={(e) => setDom(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              data-testid="heal-dom"
            />
          </div>
          <Button onClick={heal} disabled={loading} data-testid="heal-run">
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Healing…</>
              : <><Wrench className="mr-2 h-4 w-4" /> Heal selector</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wynik</CardTitle>
          <CardDescription>Strategia + alternatywy + uzasadnienie.</CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">Naciśnij „Heal selector".</p>
          ) : (
            <div className="space-y-4" data-testid="heal-result">
              <div className="flex items-center gap-2">
                <Badge variant={confColor(result.confidence) as any}>
                  confidence {(result.confidence * 100).toFixed(0)}%
                </Badge>
                <Badge variant="outline">{result.strategy}</Badge>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Stary</div>
                <code className="block rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {oldSelector}
                </code>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Nowy</div>
                <code className="block rounded-md bg-primary/10 px-3 py-2 text-xs text-primary" data-testid="heal-new">
                  {result.selector}
                </code>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Reasoning</div>
                <p className="text-sm">{result.reasoning}</p>
              </div>

              {result.alternatives?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Alternatywy</div>
                  <ul className="space-y-1">
                    {result.alternatives.map((alt, i) => (
                      <li key={i}>
                        <code className="rounded bg-muted px-2 py-1 text-xs">{alt}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Brain, Wrench, ShieldCheck, Loader2, Play, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  step_index: number;
  agent_role: "planner" | "executor" | "verifier" | string;
  input: any;
  output: any;
  reasoning: string | null;
  tokens: number | null;
  duration_ms: number | null;
  tool_name: string | null;
};

type Run = {
  id: string;
  goal: string;
  status: "running" | "done" | "error";
  result: any;
  error: string | null;
  total_tokens: number;
  total_cost_usd: number;
  duration_ms: number | null;
};

const ROLE_META: Record<string, { icon: any; label: string; color: string }> = {
  planner: { icon: Brain, label: "Planner", color: "text-blue-500" },
  executor: { icon: Wrench, label: "Executor", color: "text-amber-500" },
  verifier: { icon: ShieldCheck, label: "Verifier", color: "text-emerald-500" },
};

export default function AgentCrew() {
  const [goal, setGoal] = useState(
    "Napisz krótki plan testów regresji dla aplikacji TODO z auth, CRUD i drag-and-drop.",
  );
  const [run, setRun] = useState<Run | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [starting, setStarting] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  async function startRun() {
    if (goal.trim().length < 3) return;
    setStarting(true);
    setSteps([]);
    setRun(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const { data, error } = await supabase.functions.invoke("agent-crew", {
        body: { goal },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (error || !data?.run_id) {
        toast({ title: "Błąd uruchomienia", description: error?.message || "brak run_id", variant: "destructive" });
        setStarting(false);
        return;
      }
      const runId = data.run_id as string;

      // initial fetch + subscribe
      const { data: runRow } = await supabase.from("agent_runs").select("*").eq("id", runId).single();
      if (runRow) setRun(runRow as Run);

      if (channelRef.current) supabase.removeChannel(channelRef.current);
      const ch = supabase
        .channel(`agent-run-${runId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "agent_steps", filter: `run_id=eq.${runId}` },
          (payload) => {
            setSteps((prev) => [...prev, payload.new as Step].sort((a, b) => a.step_index - b.step_index));
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "agent_runs", filter: `id=eq.${runId}` },
          (payload) => {
            setRun(payload.new as Run);
            if ((payload.new as Run).status !== "running") {
              setStarting(false);
            }
          },
        )
        .subscribe();
      channelRef.current = ch;
    } catch (e) {
      toast({ title: "Błąd", description: String(e), variant: "destructive" });
      setStarting(false);
    }
  }

  const isRunning = run?.status === "running" || starting;

  return (
    <div className="space-y-6" data-testid="ai-agentcrew">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> Agent Crew
          </CardTitle>
          <CardDescription>
            Multi-agent pipeline: <b>Planner → Executor → Verifier</b>. Każdy krok streamuje się na żywo przez Realtime.
            Pełna obserwowalność (tokeny, koszt, latencja) trafia do Observability.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="Co ma zrobić zespół agentów?"
            disabled={isRunning}
            data-testid="agent-goal"
          />
          <div className="flex gap-2">
            <Button onClick={startRun} disabled={isRunning || goal.trim().length < 3} data-testid="agent-run">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? "Agenci pracują..." : "Uruchom crew"}
            </Button>
            {run && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{run.total_tokens} tokens</Badge>
                <Badge variant="outline">${run.total_cost_usd?.toFixed?.(6) ?? "0"}</Badge>
                {run.duration_ms != null && <Badge variant="outline">{run.duration_ms}ms</Badge>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(steps.length > 0 || isRunning) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Timeline</h2>
          {steps.map((s) => {
            const meta = ROLE_META[s.agent_role] ?? { icon: Bot, label: s.agent_role, color: "text-foreground" };
            const Icon = meta.icon;
            const out = s.output ?? {};
            const text =
              out.plan || out.draft || out.final || (typeof out === "string" ? out : JSON.stringify(out, null, 2));
            return (
              <Card key={s.id} className="border-l-4" style={{ borderLeftColor: "hsl(var(--primary))" }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-5 w-5", meta.color)} />
                      <CardTitle className="text-base">
                        Step {s.step_index + 1}: {meta.label}
                      </CardTitle>
                      {s.tool_name && <Badge variant="secondary">{s.tool_name}</Badge>}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {s.tokens != null && <span>{s.tokens} tok</span>}
                      {s.duration_ms != null && <span>{s.duration_ms}ms</span>}
                    </div>
                  </div>
                  {s.reasoning && <CardDescription className="italic">💭 {s.reasoning}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md max-h-64 overflow-auto">
                    {text}
                  </pre>
                </CardContent>
              </Card>
            );
          })}
          {isRunning && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Czekam na kolejnego agenta...
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {run?.status === "done" && run.result?.final && (
        <Card className="border-emerald-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Wynik końcowy
              {run.result.verdict && <Badge variant="outline">{run.result.verdict}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md">{run.result.final}</pre>
          </CardContent>
        </Card>
      )}

      {run?.status === "error" && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Błąd
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{run.error}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

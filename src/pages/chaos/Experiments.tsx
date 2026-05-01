import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Zap, Play, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Experiment {
  id: string;
  name: string;
  experiment_type: string;
  target: string;
  hypothesis: string | null;
  blast_radius: string;
  abort_condition: string | null;
  parameters: any;
  status: string;
  duration_ms: number | null;
  observations: any;
  conclusion: string | null;
  created_at: string;
}

const TEMPLATES = [
  {
    type: "latency",
    label: "Network Latency Injection",
    desc: "Inject 1s delay to test timeout handling",
    params: { delay_ms: 1000 },
    hypothesis: "System remains responsive with p95 latency < 2s under 1s injected delay",
  },
  {
    type: "error_injection",
    label: "HTTP 500 Errors (50%)",
    desc: "Half of requests fail with 500",
    params: { error_rate: 0.5 },
    hypothesis: "Retry logic and circuit breaker handle 50% error rate without cascading failures",
  },
  {
    type: "slow_query",
    label: "Slow Database Query (3s)",
    desc: "Simulate slow downstream service",
    params: { delay_ms: 3000 },
    hypothesis: "Slow queries do not block other requests; pool exhaustion does not occur",
  },
  {
    type: "memory_pressure",
    label: "Large Payload (32KB)",
    desc: "Test memory & bandwidth handling",
    params: { payload_size: 32768 },
    hypothesis: "System handles large payloads without OOM or excessive GC",
  },
  {
    type: "random_failure",
    label: "Random Failure (30% + 200ms)",
    desc: "Realistic flaky service simulation",
    params: { error_rate: 0.3, delay_ms: 200 },
    hypothesis: "Application gracefully degrades under intermittent failures",
  },
];

export default function ChaosExperiments() {
  const { user } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [target, setTarget] = useState("perf-target");
  const [blastRadius, setBlastRadius] = useState("small");
  const [abortCondition, setAbortCondition] = useState("error_rate > 70%");
  const [hypothesis, setHypothesis] = useState(TEMPLATES[0].hypothesis);

  const refresh = async () => {
    const { data } = await supabase
      .from("chaos_experiments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setExperiments((data ?? []) as Experiment[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("chaos-experiments")
      .on("postgres_changes", { event: "*", schema: "public", table: "chaos_experiments" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const onTemplateChange = (t: string) => {
    const tpl = TEMPLATES.find((x) => x.type === t)!;
    setTemplate(tpl);
    setHypothesis(tpl.hypothesis);
  };

  const create = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("chaos_experiments")
      .insert({
        user_id: user.id,
        name: name || `${template.label} — ${new Date().toLocaleTimeString()}`,
        experiment_type: template.type,
        target,
        hypothesis,
        blast_radius: blastRadius,
        abort_condition: abortCondition || null,
        parameters: template.params,
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Experiment created");
    setName("");
    if (data) await runExperiment(data.id);
  };

  const runExperiment = async (id: string) => {
    setRunning(id);
    const { data, error } = await supabase.functions.invoke("chaos-experiment", {
      body: { experiment_id: id },
    });
    setRunning(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Experiment ${data?.status ?? "completed"}`);
  };

  return (
    <div className="space-y-6" data-testid="chaos-experiments">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            New Experiment
          </CardTitle>
          <CardDescription>Define hypothesis, choose template, set blast radius and abort condition.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={template.type} onValueChange={onTemplateChange}>
              <SelectTrigger data-testid="template-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{template.desc}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-name">Name (optional)</Label>
            <Input
              id="exp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Login latency test"
              data-testid="exp-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-target">Target</Label>
            <Input id="exp-target" value={target} onChange={(e) => setTarget(e.target.value)} data-testid="exp-target" />
          </div>
          <div className="space-y-2">
            <Label>Blast radius</Label>
            <Select value={blastRadius} onValueChange={setBlastRadius}>
              <SelectTrigger data-testid="blast-radius-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (10 requests)</SelectItem>
                <SelectItem value="medium">Medium (25 requests)</SelectItem>
                <SelectItem value="large">Large (50 requests)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="exp-hypothesis">Hypothesis (steady-state)</Label>
            <Textarea
              id="exp-hypothesis"
              rows={2}
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              data-testid="exp-hypothesis"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="exp-abort">Abort condition</Label>
            <Input
              id="exp-abort"
              value={abortCondition}
              onChange={(e) => setAbortCondition(e.target.value)}
              placeholder="error_rate > 70%"
              data-testid="exp-abort"
            />
            <p className="text-xs text-muted-foreground">Auto-stops experiment when threshold breached. Format: <code>error_rate &gt; N%</code></p>
          </div>
        </CardContent>
        <CardContent>
          <Button onClick={create} disabled={creating} data-testid="create-experiment">
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Play className="mr-2 h-4 w-4" />
            Create & run experiment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experiment History</CardTitle>
          <CardDescription>{experiments.length} recent experiments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : experiments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No experiments yet. Create your first one above.</p>
          ) : (
            experiments.map((e) => <ExperimentCard key={e.id} exp={e} running={running === e.id} onRun={() => runExperiment(e.id)} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExperimentCard({ exp, running, onRun }: { exp: Experiment; running: boolean; onRun: () => void }) {
  const obs = exp.observations ?? {};
  return (
    <div className="rounded-lg border border-border p-4 space-y-2" data-testid={`exp-${exp.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusIcon status={exp.status} />
            <h3 className="font-medium truncate">{exp.name}</h3>
            <Badge variant="outline" className="text-xs">{exp.experiment_type}</Badge>
            <Badge variant="secondary" className="text-xs">blast: {exp.blast_radius}</Badge>
          </div>
          {exp.hypothesis && <p className="mt-1 text-xs text-muted-foreground italic">"{exp.hypothesis}"</p>}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRun}
          disabled={running || exp.status === "running"}
          data-testid={`rerun-${exp.id}`}
        >
          {running || exp.status === "running" ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Play className="mr-2 h-3 w-3" />
          )}
          Re-run
        </Button>
      </div>
      {obs.total_requests > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          <Metric label="Requests" value={obs.total_requests} />
          <Metric label="Error rate" value={`${(obs.error_rate ?? 0).toFixed(1)}%`} />
          <Metric label="p50" value={`${obs.p50_ms}ms`} />
          <Metric label="p95" value={`${obs.p95_ms}ms`} />
          <Metric label="p99" value={`${obs.p99_ms}ms`} />
        </div>
      )}
      {exp.conclusion && (
        <div className="rounded bg-muted/50 px-3 py-2 text-xs">
          <strong>Conclusion:</strong> {exp.conclusion}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "passed") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "aborted") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin" />;
  return <Zap className="h-4 w-4 text-muted-foreground" />;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-muted/30 px-2 py-1">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono font-medium">{value}</div>
    </div>
  );
}

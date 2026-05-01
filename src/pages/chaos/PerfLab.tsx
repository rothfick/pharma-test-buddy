import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Gauge, Play, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";

interface PerfRun {
  id: string;
  scenario_name: string;
  load_profile: string;
  vus: number;
  duration_seconds: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  rps: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  error_rate: number;
  raw_samples: any;
  status: string;
  created_at: string;
  finished_at: string | null;
}

const PROFILES = [
  { value: "smoke", label: "Smoke (1 VU, 5s)", vus: 1, duration: 5 },
  { value: "load", label: "Load (5 VUs, 15s)", vus: 5, duration: 15 },
  { value: "stress", label: "Stress (10 VUs, 20s)", vus: 10, duration: 20 },
  { value: "spike", label: "Spike (20 VUs, 10s)", vus: 20, duration: 10 },
  { value: "soak", label: "Soak (3 VUs, 30s)", vus: 3, duration: 30 },
];

interface Sample {
  ts: number;
  latency_ms: number;
  ok: boolean;
}

export default function PerfLab() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<PerfRun[]>([]);
  const [profile, setProfile] = useState(PROFILES[0]);
  const [scenarioName, setScenarioName] = useState("");
  const [delay, setDelay] = useState(100);
  const [errorRate, setErrorRate] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveSamples, setLiveSamples] = useState<Sample[]>([]);
  const abortRef = useRef<{ stop: boolean }>({ stop: false });

  const refresh = async () => {
    const { data } = await supabase
      .from("perf_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    setRuns((data ?? []) as PerfRun[]);
  };

  useEffect(() => {
    refresh();
  }, []);

  const start = async () => {
    if (!user) return;
    setIsRunning(true);
    setProgress(0);
    setLiveSamples([]);
    abortRef.current.stop = false;

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const targetUrl = `https://${projectId}.supabase.co/functions/v1/perf-target?delay=${delay}&error_rate=${errorRate}`;
    const startTs = Date.now();
    const endTs = startTs + profile.duration * 1000;
    const samples: Sample[] = [];

    // Spawn VUs
    const vus: Promise<void>[] = [];
    for (let v = 0; v < profile.vus; v++) {
      vus.push(
        (async () => {
          while (Date.now() < endTs && !abortRef.current.stop) {
            const t0 = Date.now();
            try {
              const resp = await fetch(targetUrl, {
                headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
              });
              const sample: Sample = { ts: t0 - startTs, latency_ms: Date.now() - t0, ok: resp.ok };
              samples.push(sample);
            } catch {
              samples.push({ ts: t0 - startTs, latency_ms: Date.now() - t0, ok: false });
            }
          }
        })()
      );
    }

    // Progress + live updates
    const progressTimer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startTs) / (profile.duration * 1000)) * 100);
      setProgress(pct);
      setLiveSamples([...samples]);
    }, 250);

    await Promise.all(vus);
    clearInterval(progressTimer);

    // Compute stats
    const latencies = samples.map((s) => s.latency_ms).sort((a, b) => a - b);
    const p = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * q))] ?? 0;
    const failed = samples.filter((s) => !s.ok).length;
    const totalDur = (Date.now() - startTs) / 1000;
    const errorRateActual = samples.length > 0 ? (failed / samples.length) * 100 : 0;

    const { error } = await supabase.from("perf_runs").insert({
      // @ts-expect-error - types regenerate after migration
      user_id: user.id,
      scenario_name: scenarioName || `${profile.label} — ${new Date().toLocaleTimeString()}`,
      target_url: targetUrl,
      load_profile: profile.value,
      vus: profile.vus,
      duration_seconds: profile.duration,
      total_requests: samples.length,
      successful_requests: samples.length - failed,
      failed_requests: failed,
      rps: totalDur > 0 ? samples.length / totalDur : 0,
      p50_ms: p(0.5),
      p95_ms: p(0.95),
      p99_ms: p(0.99),
      max_ms: latencies[latencies.length - 1] ?? 0,
      min_ms: latencies[0] ?? 0,
      error_rate: errorRateActual,
      raw_samples: samples.slice(0, 500),
      status: "completed",
      slo_passed: p(0.95) <= 500 && errorRateActual <= 0.1,
      finished_at: new Date().toISOString(),
    });

    setIsRunning(false);
    setProgress(100);
    if (error) toast.error(error.message);
    else toast.success(`Run complete: ${samples.length} reqs, p95=${p(0.95)}ms`);
    refresh();
  };

  const stop = () => {
    abortRef.current.stop = true;
    toast.info("Stopping...");
  };

  // Build histogram from live samples
  const histogram = buildHistogram(liveSamples.map((s) => s.latency_ms));
  const trend = liveSamples
    .filter((_, i) => i % Math.max(1, Math.floor(liveSamples.length / 50)) === 0)
    .map((s) => ({ ts: Math.round(s.ts / 1000), latency: s.latency_ms }));

  return (
    <div className="space-y-6" data-testid="perf-lab">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Performance Test Runner
          </CardTitle>
          <CardDescription>Browser-based load generator targeting an edge function. Live latency telemetry.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Load profile</Label>
            <Select
              value={profile.value}
              onValueChange={(v) => setProfile(PROFILES.find((p) => p.value === v)!)}
              disabled={isRunning}
            >
              <SelectTrigger data-testid="profile-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROFILES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario">Scenario name (optional)</Label>
            <Input
              id="scenario"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g. Login API baseline"
              disabled={isRunning}
              data-testid="scenario-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-delay">Target latency (ms)</Label>
            <Input
              id="target-delay"
              type="number"
              min={0}
              max={5000}
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
              disabled={isRunning}
              data-testid="target-delay"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-error">Target error rate (0-1)</Label>
            <Input
              id="target-error"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={errorRate}
              onChange={(e) => setErrorRate(parseFloat(e.target.value) || 0)}
              disabled={isRunning}
              data-testid="target-error"
            />
          </div>
        </CardContent>
        <CardContent className="flex gap-2">
          {isRunning ? (
            <Button variant="destructive" onClick={stop} data-testid="stop-perf">
              <StopCircle className="mr-2 h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button onClick={start} data-testid="start-perf">
              <Play className="mr-2 h-4 w-4" /> Start load test
            </Button>
          )}
          {isRunning && (
            <div className="flex-1 space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{liveSamples.length} samples · {Math.round(progress)}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {liveSamples.length > 0 && (
        <Card data-testid="live-charts">
          <CardHeader>
            <CardTitle>Live Telemetry</CardTitle>
            <CardDescription>Latency distribution and time-series during the run</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium mb-2">Latency Histogram</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histogram}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                  <ReferenceLine x="500ms" stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="SLO" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Latency over time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <XAxis dataKey="ts" tick={{ fontSize: 10 }} unit="s" />
                  <YAxis tick={{ fontSize: 10 }} unit="ms" />
                  <Tooltip />
                  <Line type="monotone" dataKey="latency" stroke="hsl(var(--primary))" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {runs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No runs yet.</p>
          ) : (
            runs.map((r) => <RunRow key={r.id} run={r} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RunRow({ run }: { run: PerfRun }) {
  const sloOk = run.slo_passed;
  return (
    <div className="rounded-lg border border-border p-3" data-testid={`run-${run.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{run.scenario_name}</h3>
            <Badge variant="outline" className="text-xs">{run.load_profile}</Badge>
            {sloOk !== null && (
              <Badge variant={sloOk ? "default" : "destructive"} className="text-xs">
                {sloOk ? "SLO ✓" : "SLO ✗"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(run.created_at).toLocaleString()} · {run.vus} VUs · {run.duration_seconds}s
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
        <Metric label="Reqs" value={run.total_requests} />
        <Metric label="RPS" value={run.rps.toFixed(1)} />
        <Metric label="Errors" value={`${run.error_rate.toFixed(1)}%`} />
        <Metric label="p50" value={`${run.p50_ms}ms`} />
        <Metric label="p95" value={`${run.p95_ms}ms`} />
        <Metric label="p99" value={`${run.p99_ms}ms`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-muted/30 px-2 py-1">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono font-medium">{value}</div>
    </div>
  );
}

function buildHistogram(values: number[]) {
  if (values.length === 0) return [];
  const buckets = [0, 50, 100, 200, 500, 1000, 2000, 5000];
  const out = buckets.map((b, i) => ({
    bucket: i === buckets.length - 1 ? `${b}ms+` : `${b}ms`,
    count: 0,
  }));
  for (const v of values) {
    let placed = false;
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (v >= buckets[i]) {
        out[i].count++;
        placed = true;
        break;
      }
    }
    if (!placed) out[0].count++;
  }
  return out;
}

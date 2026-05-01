import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Run = {
  id: string;
  phase: "IQ" | "OQ" | "PQ";
  name: string;
  description: string | null;
  status: "pending" | "passed" | "failed" | "blocked";
  executed_by: string | null;
  executed_at: string | null;
};

const PHASE_LABEL = {
  IQ: "Installation Qualification",
  OQ: "Operational Qualification",
  PQ: "Performance Qualification",
};

const statusIcon = (s: Run["status"]) => {
  if (s === "passed") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (s === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  if (s === "blocked") return <ShieldAlert className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
};

export default function Validation() {
  const [runs, setRuns] = useState<Run[]>([]);

  const load = async () => {
    const { data, error } = await supabase
      .from("validation_runs")
      .select("*")
      .order("phase")
      .order("name");
    if (error) toast.error(error.message);
    else setRuns((data ?? []) as Run[]);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: Run["status"]) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("validation_runs")
      .update({ status, executed_by: user?.id, executed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Marked as ${status}`); load(); }
  };

  const phases: Array<"IQ" | "OQ" | "PQ"> = ["IQ", "OQ", "PQ"];

  return (
    <div className="space-y-6" data-testid="validation-page">
      {phases.map((phase) => {
        const items = runs.filter((r) => r.phase === phase);
        const passed = items.filter((r) => r.status === "passed").length;
        const score = items.length === 0 ? 0 : Math.round((passed / items.length) * 100);
        return (
          <Card key={phase} data-testid={`val-phase-${phase}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{phase} — {PHASE_LABEL[phase]}</span>
                <Badge variant={score === 100 ? "default" : "secondary"}>
                  {passed}/{items.length} passed
                </Badge>
              </CardTitle>
              <CardDescription>
                {phase === "IQ" && "Czy system jest poprawnie zainstalowany w środowisku docelowym?"}
                {phase === "OQ" && "Czy system działa zgodnie ze specyfikacją funkcjonalną?"}
                {phase === "PQ" && "Czy system spełnia wymagania wydajnościowe i biznesowe?"}
              </CardDescription>
              <Progress value={score} className="mt-2" />
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border p-3"
                  data-testid={`val-item-${r.id}`}
                >
                  <div className="flex items-start gap-3">
                    {statusIcon(r.status)}
                    <div>
                      <div className="font-medium">{r.name}</div>
                      {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant={r.status === "passed" ? "default" : "outline"} onClick={() => setStatus(r.id, "passed")}>Pass</Button>
                    <Button size="sm" variant={r.status === "failed" ? "destructive" : "outline"} onClick={() => setStatus(r.id, "failed")}>Fail</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "pending")}>Reset</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

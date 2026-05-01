import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2, Play, Save, Plus, ArrowDown, CircleCheck, CircleX, Loader2, Workflow as WIcon } from "lucide-react";
import { toast } from "sonner";

type NodeType = "input" | "llm" | "transform" | "http" | "condition" | "output";
interface WFNode { id: string; type: NodeType; label?: string; config: Record<string, any>; }
interface WFEdge { id: string; source: string; target: string; branch?: string; }

const NODE_PRESETS: Record<NodeType, { label: string; config: Record<string, any> }> = {
  input:     { label: "Input",     config: {} },
  llm:       { label: "LLM call",  config: { model: "google/gemini-3-flash-preview", prompt: "Summarize: {{input.text}}", temperature: 0.4, max_tokens: 500, feature: "workflow" } },
  transform: { label: "Transform", config: { expression: "({ words: String(ctx.input?.text ?? '').split(' ').length })" } },
  http:      { label: "HTTP",      config: { url: "https://api.github.com/repos/denoland/deno", method: "GET" } },
  condition: { label: "Condition", config: { expression: "(ctx.input?.threshold ?? 0) > 0.5" } },
  output:    { label: "Output",    config: {} },
};

const SAMPLE_TEMPLATE = {
  name: "Summarize + word count",
  description: "Sample DAG: input → LLM summary → transform → output",
  nodes: [
    { id: "n1", type: "input" as const, label: "Input", config: {} },
    { id: "n2", type: "llm"   as const, label: "Summarize",
      config: { model: "google/gemini-3-flash-preview", prompt: "In one sentence summarize: {{input.text}}", temperature: 0.3, max_tokens: 120, feature: "workflow_demo" } },
    { id: "n3", type: "transform" as const, label: "Word count",
      config: { expression: "({ summary: ctx.n2, words: String(ctx.n2 ?? '').split(/\\s+/).length })" } },
    { id: "n4", type: "output" as const, label: "Output", config: {} },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
    { id: "e3", source: "n3", target: "n4" },
  ],
};

export default function WorkflowBuilder() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState(SAMPLE_TEMPLATE.name);
  const [description, setDescription] = useState(SAMPLE_TEMPLATE.description);
  const [nodes, setNodes] = useState<WFNode[]>(SAMPLE_TEMPLATE.nodes);
  const [edges, setEdges] = useState<WFEdge[]>(SAMPLE_TEMPLATE.edges);
  const [selected, setSelected] = useState<string | null>("n2");
  const [inputJson, setInputJson] = useState('{"text": "Lovable AI Lab umożliwia szybkie budowanie i testowanie pipeline\'ów AI."}');
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selected) ?? null, [nodes, selected]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("workflows").select("id, name, updated_at").order("updated_at", { ascending: false });
      setWorkflows(data ?? []);
    })();
  }, []);

  function addNode(type: NodeType) {
    const id = `n${Date.now().toString(36)}`;
    const preset = NODE_PRESETS[type];
    const newNode: WFNode = { id, type, label: preset.label, config: { ...preset.config } };
    setNodes((prev) => [...prev, newNode]);
    if (nodes.length > 0) {
      const last = nodes[nodes.length - 1];
      setEdges((prev) => [...prev, { id: `e${id}`, source: last.id, target: id }]);
    }
    setSelected(id);
  }

  function deleteNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    if (selected === id) setSelected(null);
  }

  function updateNode(id: string, patch: Partial<WFNode>) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, config: { ...n.config, ...(patch.config ?? {}) } } : n)));
  }

  async function handleSave() {
    if (!user) { toast.error("Zaloguj się"); return; }
    const payload: any = { user_id: user.id, name, description, nodes: nodes as any, edges: edges as any };
    if (currentId) {
      const { error } = await supabase.from("workflows").update(payload).eq("id", currentId);
      if (error) { toast.error(error.message); return; }
      toast.success("Workflow zapisany");
    } else {
      const { data, error } = await supabase.from("workflows").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      setCurrentId(data.id);
      toast.success("Workflow utworzony");
    }
    const { data } = await supabase.from("workflows").select("id, name, updated_at").order("updated_at", { ascending: false });
    setWorkflows(data ?? []);
  }

  async function handleLoad(id: string) {
    const { data, error } = await supabase.from("workflows").select("*").eq("id", id).maybeSingle();
    if (error || !data) { toast.error("Nie udało się załadować"); return; }
    setCurrentId(data.id);
    setName(data.name);
    setDescription(data.description ?? "");
    setNodes((data.nodes as any) ?? []);
    setEdges((data.edges as any) ?? []);
    setSelected(null);
    setLastRun(null);
  }

  async function handleRun() {
    setRunning(true);
    setLastRun(null);
    let parsedInput: any = {};
    try { parsedInput = JSON.parse(inputJson); } catch { toast.error("Input nie jest poprawnym JSON-em"); setRunning(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke("workflow-execute", {
        body: { workflow_id: currentId, nodes, edges, input: parsedInput, dry_run: !currentId },
      });
      if (error) throw error;
      setLastRun(data);
      if (data?.status === "success") toast.success(`Workflow OK · ${data.duration_ms}ms`);
      else toast.error(`Błąd: ${data?.error ?? "unknown"}`);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="wf-builder">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WIcon className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">Workflow Builder</h2>
          <Badge variant="secondary">DAG · multi-step AI pipelines</Badge>
        </div>
        <div className="flex gap-2">
          <Select onValueChange={handleLoad} value={currentId ?? undefined}>
            <SelectTrigger className="w-[220px]" data-testid="wf-load"><SelectValue placeholder="Load workflow…" /></SelectTrigger>
            <SelectContent>
              {workflows.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleSave} data-testid="wf-save"><Save className="mr-2 h-4 w-4" />Save</Button>
          <Button onClick={handleRun} disabled={running} data-testid="wf-run">
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Palette */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Add node</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(["input","llm","transform","http","condition","output"] as NodeType[]).map((t) => (
              <Button key={t} variant="outline" size="sm" className="justify-start" onClick={() => addNode(t)} data-testid={`wf-add-${t}`}>
                <Plus className="mr-2 h-3 w-3" />{NODE_PRESETS[t].label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Canvas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" data-testid="wf-name" />
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" data-testid="wf-desc" />
              </div>
              <Separator />
              <div className="flex flex-col items-stretch gap-2" data-testid="wf-canvas">
                {nodes.length === 0 && <p className="text-sm text-muted-foreground italic">Pusto. Dodaj pierwszy node z palety.</p>}
                {nodes.map((n, idx) => {
                  const stepRes = lastRun?.steps?.find((s: any) => s.id === n.id);
                  const statusColor =
                    stepRes?.status === "success" ? "border-green-500/60 bg-green-500/5" :
                    stepRes?.status === "error" ? "border-destructive/60 bg-destructive/5" :
                    stepRes?.status === "skipped" ? "border-muted-foreground/30 bg-muted/30" :
                    selected === n.id ? "border-primary bg-primary/5" : "border-border";
                  return (
                    <div key={n.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(n.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") setSelected(n.id); }}
                        data-testid={`wf-node-${n.id}`}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-md border-2 px-3 py-2 text-left transition-colors ${statusColor}`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">{n.type}</Badge>
                          <span className="font-medium">{n.label ?? n.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {stepRes?.status === "success" && <CircleCheck className="h-4 w-4 text-green-500" />}
                          {stepRes?.status === "error" && <CircleX className="h-4 w-4 text-destructive" />}
                          {stepRes?.duration_ms != null && <span className="text-xs text-muted-foreground">{stepRes.duration_ms}ms</span>}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteNode(n.id); }}
                            className="rounded p-1 text-muted-foreground hover:text-destructive"
                            aria-label="Delete node"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {idx < nodes.length - 1 && <div className="flex justify-center py-1"><ArrowDown className="h-4 w-4 text-muted-foreground" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspector */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Inspector</CardTitle></CardHeader>
          <CardContent>
            {!selectedNode ? (
              <p className="text-sm text-muted-foreground italic">Wybierz node żeby edytować.</p>
            ) : (
              <div className="space-y-3" data-testid="wf-inspector">
                <div>
                  <Label>Label</Label>
                  <Input value={selectedNode.label ?? ""} onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })} />
                </div>
                {selectedNode.type === "llm" && (
                  <>
                    <div>
                      <Label>Model</Label>
                      <Select value={selectedNode.config.model} onValueChange={(v) => updateNode(selectedNode.id, { config: { model: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google/gemini-2.5-flash-lite">gemini-2.5-flash-lite</SelectItem>
                          <SelectItem value="google/gemini-3-flash-preview">gemini-3-flash-preview</SelectItem>
                          <SelectItem value="google/gemini-2.5-flash">gemini-2.5-flash</SelectItem>
                          <SelectItem value="google/gemini-2.5-pro">gemini-2.5-pro</SelectItem>
                          <SelectItem value="openai/gpt-5-mini">gpt-5-mini</SelectItem>
                          <SelectItem value="openai/gpt-5">gpt-5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>System (opcjonalny)</Label>
                      <Textarea rows={2} value={selectedNode.config.system ?? ""} onChange={(e) => updateNode(selectedNode.id, { config: { system: e.target.value } })} />
                    </div>
                    <div>
                      <Label>Prompt (użyj {"{{input.field}}"} lub {"{{nodeId}}"})</Label>
                      <Textarea rows={4} value={selectedNode.config.prompt ?? ""} onChange={(e) => updateNode(selectedNode.id, { config: { prompt: e.target.value } })} data-testid="wf-prompt" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Temperature</Label><Input type="number" step="0.1" value={selectedNode.config.temperature} onChange={(e) => updateNode(selectedNode.id, { config: { temperature: Number(e.target.value) } })} /></div>
                      <div><Label>Max tokens</Label><Input type="number" value={selectedNode.config.max_tokens} onChange={(e) => updateNode(selectedNode.id, { config: { max_tokens: Number(e.target.value) } })} /></div>
                    </div>
                  </>
                )}
                {selectedNode.type === "transform" && (
                  <div>
                    <Label>JS expression (dostęp przez <code>ctx</code>)</Label>
                    <Textarea rows={5} value={selectedNode.config.expression ?? ""} onChange={(e) => updateNode(selectedNode.id, { config: { expression: e.target.value } })} className="font-mono text-xs" />
                  </div>
                )}
                {selectedNode.type === "condition" && (
                  <div>
                    <Label>Condition (ctx → boolean)</Label>
                    <Textarea rows={3} value={selectedNode.config.expression ?? ""} onChange={(e) => updateNode(selectedNode.id, { config: { expression: e.target.value } })} className="font-mono text-xs" />
                  </div>
                )}
                {selectedNode.type === "http" && (
                  <>
                    <div><Label>URL</Label><Input value={selectedNode.config.url ?? ""} onChange={(e) => updateNode(selectedNode.id, { config: { url: e.target.value } })} /></div>
                    <div><Label>Method</Label>
                      <Select value={selectedNode.config.method ?? "GET"} onValueChange={(v) => updateNode(selectedNode.id, { config: { method: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["GET","POST","PUT","DELETE","PATCH"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Run panel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Input (JSON)</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={6} value={inputJson} onChange={(e) => setInputJson(e.target.value)} className="font-mono text-xs" data-testid="wf-input" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Last run</CardTitle></CardHeader>
          <CardContent>
            {!lastRun ? <p className="text-sm text-muted-foreground italic">Brak. Kliknij Run.</p> : (
              <div className="space-y-2" data-testid="wf-result">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={lastRun.status === "success" ? "default" : "destructive"}>{lastRun.status}</Badge>
                  <span className="text-muted-foreground">{lastRun.duration_ms}ms</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">${(lastRun.total_cost_usd ?? 0).toFixed(6)}</span>
                  <span className="text-muted-foreground">· {lastRun.total_tokens ?? 0} tok</span>
                </div>
                {lastRun.error && <pre className="overflow-auto rounded bg-destructive/10 p-2 text-xs text-destructive">{lastRun.error}</pre>}
                <pre className="max-h-72 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(lastRun.output ?? lastRun.steps, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

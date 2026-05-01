import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Dices, Database, Download, FileCode, Loader2, Sparkles } from "lucide-react";

type Entity = "tasks" | "users" | "rag_docs";

const PRESETS: Record<string, { entity: Entity; scene: string; edge: boolean }> = {
  "Sprint e-commerce (10 tasks)": {
    entity: "tasks",
    scene: "10 tasks for an e-commerce sprint: checkout bugs, performance issues, A/B tests, mixed priorities and statuses",
    edge: false,
  },
  "Diverse user pool": {
    entity: "users",
    scene: "15 diverse user profiles: mix of cultures, roles (admin/manager/user), realistic professional backgrounds",
    edge: false,
  },
  "RAG knowledge base": {
    entity: "rag_docs",
    scene: "8 documents about software testing: Playwright basics, CI/CD, test pyramid, page objects, flaky tests",
    edge: false,
  },
  "Edge cases pack 🔥": {
    entity: "tasks",
    scene: "10 tasks specifically designed to break naive UIs and test resilience",
    edge: true,
  },
};

export default function SyntheticData() {
  const [entity, setEntity] = useState<Entity>("tasks");
  const [count, setCount] = useState([10]);
  const [scene, setScene] = useState(
    "10 tasks for an e-commerce sprint: checkout bugs, performance issues, A/B tests, mixed priorities and statuses"
  );
  const [edgeCases, setEdgeCases] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [persisting, setPersisting] = useState(false);

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setEntity(p.entity);
    setScene(p.scene);
    setEdgeCases(p.edge);
    setCount([p.entity === "users" ? 15 : p.entity === "rag_docs" ? 8 : 10]);
  };

  const generate = async () => {
    setLoading(true);
    setItems([]);
    try {
      const { data, error } = await supabase.functions.invoke("synthetic-data", {
        body: { entity, count: count[0], scene, edge_cases: edgeCases, persist: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      setItems(data.items ?? []);
      toast.success(`Wygenerowano ${data.items?.length ?? 0} ${entity}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const persistToDb = async () => {
    if (entity === "users") {
      toast.info("Users to tylko preview — nie tworzymy realnych auth users.");
      return;
    }
    if (items.length === 0) {
      toast.error("Najpierw wygeneruj dane");
      return;
    }
    setPersisting(true);
    try {
      const { data, error } = await supabase.functions.invoke("synthetic-data", {
        body: { entity, count: count[0], scene, edge_cases: edgeCases, persist: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      toast.success(`Zapisano ${data.inserted ?? 0} rekordów do bazy`);
      setItems(data.items ?? items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Persist failed");
    } finally {
      setPersisting(false);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}-fixtures.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTs = () => {
    const typeName = entity.charAt(0).toUpperCase() + entity.slice(1, -1);
    const ts = `// Auto-generated QA fixtures — ${new Date().toISOString()}
// Scenario: ${scene.replace(/\n/g, " ")}

export type ${typeName}Fixture = ${JSON.stringify(items[0] ?? {}, null, 2)
      .replace(/"([^"]+)":/g, "$1:")
      .replace(/"([^"]*)"/g, "string")
      .replace(/string,/g, "string;")
      .replace(/string\n/g, "string;\n")};

export const ${entity}Fixtures: ${typeName}Fixture[] = ${JSON.stringify(items, null, 2)};
`;
    const blob = new Blob([ts], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}.fixtures.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = items[0] ? Object.keys(items[0]) : [];

  return (
    <div className="space-y-6" data-testid="synthetic-data">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" /> Synthetic Data Generator
        </h2>
        <p className="text-sm text-muted-foreground">
          AI generuje deterministyczne fixture'y do testów. Tool-calling
          gwarantuje schemę. Eksport do JSON / TypeScript / wprost do bazy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Konfiguracja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Presety</Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((k) => (
                <Button
                  key={k}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(k)}
                  data-testid={`preset-${k}`}
                >
                  {k}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entity">Typ encji</Label>
              <Select value={entity} onValueChange={(v) => setEntity(v as Entity)}>
                <SelectTrigger id="entity" data-testid="sd-entity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tasks">Tasks (do tabeli tasks)</SelectItem>
                  <SelectItem value="users">Users (preview only)</SelectItem>
                  <SelectItem value="rag_docs">RAG documents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ilość: {count[0]}</Label>
              <Slider
                value={count}
                onValueChange={setCount}
                min={1}
                max={50}
                step={1}
                data-testid="sd-count"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scene">Scena / kontekst</Label>
            <Textarea
              id="scene"
              data-testid="sd-scene"
              rows={3}
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="np. 10 zadań dla zespołu marketing, mix priorytetów, deadline w tym tygodniu"
            />
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border p-3">
            <Switch
              id="edge"
              checked={edgeCases}
              onCheckedChange={setEdgeCases}
              data-testid="sd-edge"
            />
            <div className="flex-1">
              <Label htmlFor="edge" className="cursor-pointer">
                Edge cases mode 🔥
              </Label>
              <p className="text-xs text-muted-foreground">
                Wymusza trudne wartości: bardzo długie tytuły, znaki specjalne,
                emoji, mix języków, SQL-injection-like strings.
              </p>
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={loading}
            className="w-full"
            data-testid="sd-generate"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generuję {count[0]} {entity}…
              </>
            ) : (
              <>
                <Dices className="mr-2 h-4 w-4" />
                Wygeneruj fixture'y
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card data-testid="sd-results">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Preview ({items.length})</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sprawdź zanim zapiszesz / wyeksportujesz
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadJson}
                  data-testid="sd-export-json"
                >
                  <Download className="mr-2 h-4 w-4" /> JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTs}
                  data-testid="sd-export-ts"
                >
                  <FileCode className="mr-2 h-4 w-4" /> TS fixture
                </Button>
                <Button
                  size="sm"
                  onClick={persistToDb}
                  disabled={persisting || entity === "users"}
                  data-testid="sd-persist"
                >
                  {persisting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="mr-2 h-4 w-4" />
                  )}
                  Zapisz do bazy
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {columns.map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, i) => (
                    <TableRow key={i} data-testid={`sd-row-${i}`}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      {columns.map((c) => {
                        const v = row[c];
                        const isLong = typeof v === "string" && v.length > 200;
                        return (
                          <TableCell key={c} className="max-w-md align-top">
                            {["status", "priority", "role_hint"].includes(c) ? (
                              <Badge variant="outline">{String(v)}</Badge>
                            ) : (
                              <div className={isLong ? "text-xs" : "text-sm"}>
                                {isLong ? String(v).slice(0, 300) + "…" : String(v ?? "")}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

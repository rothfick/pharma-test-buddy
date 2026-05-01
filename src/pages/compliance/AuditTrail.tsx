import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Entry = {
  id: string;
  user_email: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  reason: string | null;
  prev_hash: string | null;
  current_hash: string;
  created_at: string;
  old_data: unknown;
  new_data: unknown;
};

export default function AuditTrail() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [chainOk, setChainOk] = useState<boolean | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setEntries((data ?? []) as Entry[]);
    setLoading(false);
  };

  const verifyChain = async () => {
    const { data } = await supabase
      .from("audit_log")
      .select("prev_hash, current_hash, created_at")
      .order("created_at", { ascending: true });
    if (!data || data.length === 0) {
      setChainOk(true);
      return;
    }
    let ok = true;
    let lastHash: string | null = "GENESIS";
    for (const row of data) {
      // ignore esign mirror entries (they use ESIG sentinel)
      if (row.prev_hash === "ESIG") continue;
      if (row.prev_hash !== lastHash) { ok = false; break; }
      lastHash = row.current_hash as string;
    }
    setChainOk(ok);
    toast[ok ? "success" : "error"](ok ? "Chain integrity OK" : "Chain integrity BROKEN");
  };

  const writeDemo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("audit-logger", {
      body: {
        entity_type: "demo",
        entity_id: crypto.randomUUID(),
        action: "manual-test",
        new_data: { source: "audit-trail-ui", ts: new Date().toISOString() },
        reason: "Demo entry from Compliance UI",
      },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (res.error) toast.error(res.error.message);
    else { toast.success("Audit entry written"); load(); }
  };

  const exportCsv = () => {
    const headers = ["created_at", "user_email", "entity_type", "entity_id", "action", "reason", "prev_hash", "current_hash"];
    const rows = entries.map((e) =>
      headers.map((h) => JSON.stringify((e as any)[h] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString()}.csv`;
    a.click();
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter((e) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      e.entity_type.toLowerCase().includes(f) ||
      e.action.toLowerCase().includes(f) ||
      (e.user_email ?? "").toLowerCase().includes(f) ||
      (e.entity_id ?? "").toLowerCase().includes(f)
    );
  });

  return (
    <div className="space-y-4" data-testid="audit-trail">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Trail — immutable, chain-hashed</span>
            {chainOk !== null && (
              <Badge variant={chainOk ? "default" : "destructive"} data-testid="chain-status">
                {chainOk ? <ShieldCheck className="mr-1 h-3 w-3" /> : <ShieldAlert className="mr-1 h-3 w-3" />}
                {chainOk ? "Chain OK" : "Chain BROKEN"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Filter by entity, action, email…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                data-testid="audit-filter"
              />
            </div>
            <Button variant="outline" onClick={load} disabled={loading} data-testid="audit-reload">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Reload
            </Button>
            <Button variant="outline" onClick={verifyChain} data-testid="audit-verify">
              <ShieldCheck className="mr-2 h-4 w-4" /> Verify chain
            </Button>
            <Button variant="outline" onClick={exportCsv} data-testid="audit-export">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={writeDemo} data-testid="audit-write-demo">+ Demo entry</Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                )}
                {filtered.map((e) => (
                  <TableRow key={e.id} data-testid="audit-row">
                    <TableCell className="font-mono text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{e.user_email ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{e.entity_type}</span>
                      {e.entity_id && <span className="text-muted-foreground"> · {e.entity_id.slice(0, 8)}</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{e.action}</Badge></TableCell>
                    <TableCell className="text-xs">{e.reason ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground" title={e.current_hash}>
                      {e.current_hash.slice(0, 12)}…
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

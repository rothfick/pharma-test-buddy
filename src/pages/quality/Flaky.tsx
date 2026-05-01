import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = ["open", "investigating", "fixed", "wontfix"] as const;
const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive", investigating: "default", fixed: "secondary", wontfix: "outline",
};

export default function Flaky() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("flaky_tests").select("*").order("last_failed_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("flaky_tests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    load();
  };

  return (
    <Card data-testid="flaky-page">
      <CardHeader>
        <CardTitle>Flaky Tests Registry</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No flaky tests recorded. Ingest via <code>type:"flaky"</code>.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Suite</TableHead>
                <TableHead>Failures</TableHead>
                <TableHead>Last Failed</TableHead>
                <TableHead>Root Cause</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-testid={`flaky-row-${r.id}`}>
                  <TableCell className="font-mono text-xs">{r.test_name}</TableCell>
                  <TableCell>{r.suite_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.failure_count}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.last_failed_at).toLocaleString()}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs">{r.root_cause ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

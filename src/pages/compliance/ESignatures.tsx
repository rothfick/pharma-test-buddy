import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FileSignature, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Sig = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  meaning: string;
  reason: string;
  signed_by_email: string;
  witness_email: string | null;
  signature_hash: string;
  created_at: string;
};

export default function ESignatures() {
  const [sigs, setSigs] = useState<Sig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOAuth, setIsOAuth] = useState(false);
  const [provider, setProvider] = useState<string>("email");
  const [form, setForm] = useState({
    entity_type: "task",
    entity_id: "",
    action: "approve",
    meaning: "approval",
    reason: "",
    password: "",
    confirmation: "",
    witness_email: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("e_signatures")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else setSigs((data ?? []) as Sig[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const p = (user?.app_metadata?.provider as string) ?? "email";
      setProvider(p);
      setIsOAuth(p !== "email");
    });
  }, []);

  const sign = async () => {
    if (!form.entity_id || !form.reason) {
      toast.error("Entity ID and reason are required");
      return;
    }
    if (isOAuth && form.confirmation.trim().toUpperCase() !== "I CONFIRM") {
      toast.error('Type "I CONFIRM" to re-authenticate');
      return;
    }
    if (!isOAuth && !form.password) {
      toast.error("Password required");
      return;
    }
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("e-sign", {
      body: {
        entity_type: form.entity_type,
        entity_id: form.entity_id,
        action: form.action,
        meaning: form.meaning,
        reason: form.reason,
        password: isOAuth ? undefined : form.password,
        confirmation: isOAuth ? form.confirmation : undefined,
        witness_email: form.witness_email || undefined,
      },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error.message);
    } else if ((res.data as any)?.error) {
      toast.error((res.data as any).error);
    } else {
      toast.success("Signed & recorded");
      setForm({ ...form, password: "", confirmation: "", reason: "" });
      load();
    }
  };

  return (
    <div className="space-y-4" data-testid="esig-page">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" /> New Electronic Signature (21 CFR Part 11 §11.200)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Entity type</Label>
            <Input value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} data-testid="esig-entity-type" />
          </div>
          <div>
            <Label>Entity ID *</Label>
            <Input value={form.entity_id} onChange={(e) => setForm({ ...form, entity_id: e.target.value })} placeholder="UUID or ref" data-testid="esig-entity-id" />
          </div>
          <div>
            <Label>Action</Label>
            <Input value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} data-testid="esig-action" />
          </div>
          <div>
            <Label>Meaning</Label>
            <Select value={form.meaning} onValueChange={(v) => setForm({ ...form, meaning: v })}>
              <SelectTrigger data-testid="esig-meaning"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approval">Approval</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="authorship">Authorship</SelectItem>
                <SelectItem value="responsibility">Responsibility</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Reason *</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why are you signing this?" data-testid="esig-reason" />
          </div>
          <div>
            <Label>Witness email (optional, dual-control)</Label>
            <Input value={form.witness_email} onChange={(e) => setForm({ ...form, witness_email: e.target.value })} data-testid="esig-witness" />
          </div>
          <div>
            <Label>Your password * (re-auth)</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="esig-password" />
          </div>
          <div className="md:col-span-2">
            <Button onClick={sign} disabled={submitting} data-testid="esig-submit">
              {submitting ? "Signing…" : "Sign & Record"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Signature register</span>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Signer</TableHead>
                  <TableHead>Witness</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sigs.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No signatures</TableCell></TableRow>
                )}
                {sigs.map((s) => (
                  <TableRow key={s.id} data-testid="esig-row">
                    <TableCell className="font-mono text-xs">{new Date(s.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{s.signed_by_email}</TableCell>
                    <TableCell className="text-xs">{s.witness_email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.entity_type} · {s.entity_id.slice(0, 8)}</TableCell>
                    <TableCell><Badge>{s.meaning}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{s.reason}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{s.signature_hash.slice(0, 12)}…</TableCell>
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

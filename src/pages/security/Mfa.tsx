import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

interface EnrollState {
  factorId: string;
  qr: string;
  secret: string;
  uri: string;
}

export default function Mfa() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("My Authenticator");
  const [verifying, setVerifying] = useState(false);
  const [aal, setAal] = useState<string>("aal1");

  const refresh = async () => {
    const [{ data }, { data: aalData }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    setFactors([...(data?.totp ?? [])] as Factor[]);
    setAal(aalData?.currentLevel ?? "aal1");
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: name || `Authenticator ${Date.now()}`,
    });
    setEnrolling(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEnroll({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
  };

  const verify = async () => {
    if (!enroll) return;
    setVerifying(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (chErr || !ch) {
      setVerifying(false);
      toast.error(chErr?.message ?? "Challenge failed");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: ch.id,
      code: code.trim(),
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("MFA enabled — session upgraded to AAL2");
    setEnroll(null);
    setCode("");
    refresh();
  };

  const unenroll = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) toast.error(error.message);
    else {
      toast.success("Factor removed");
      refresh();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="mfa-loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="mfa-page">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Authenticator factors
              </CardTitle>
              <CardDescription>Time-based one-time passwords (RFC 6238)</CardDescription>
            </div>
            <Badge variant={aal === "aal2" ? "default" : "secondary"} data-testid="aal-badge">
              Session: {aal.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {factors.length === 0 && (
            <Alert>
              <AlertDescription>No MFA factors enrolled. Add one to reach AAL2.</AlertDescription>
            </Alert>
          )}
          {factors.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
              data-testid={`factor-${f.id}`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className={f.status === "verified" ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground"}
                />
                <div>
                  <div className="text-sm font-medium">{f.friendly_name || f.factor_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.factor_type.toUpperCase()} · {f.status} ·{" "}
                    {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => unenroll(f.id)} data-testid={`unenroll-${f.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {!enroll ? (
        <Card>
          <CardHeader>
            <CardTitle>Add new factor</CardTitle>
            <CardDescription>Use Google Authenticator, 1Password, Authy, etc.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="factor-name">Friendly name</Label>
              <Input
                id="factor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="factor-name"
              />
            </div>
            <Button onClick={startEnroll} disabled={enrolling} data-testid="start-enroll">
              {enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Begin enrollment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="enroll-card">
          <CardHeader>
            <CardTitle>Scan QR code</CardTitle>
            <CardDescription>Scan with your authenticator, then enter the 6-digit code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div
                className="rounded-lg border border-border bg-white p-3"
                dangerouslySetInnerHTML={{ __html: enroll.qr }}
                data-testid="enroll-qr"
              />
              <div className="flex-1 space-y-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Manual secret</div>
                  <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs" data-testid="enroll-secret">
                    {enroll.secret}
                  </code>
                </div>
                <div className="text-xs text-muted-foreground">
                  After scanning, your app shows a rotating 6-digit code. Enter it below to activate.
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totp-code">6-digit code</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                data-testid="totp-code"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={verify} disabled={verifying || code.length !== 6} data-testid="verify-code">
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & activate
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
                  setEnroll(null);
                  setCode("");
                  refresh();
                }}
                data-testid="cancel-enroll"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

interface SessionInfo {
  userId: string;
  email: string;
  provider: string;
  aal: string;
  amr: string[];
  expiresAt: string;
  issuedAt: string;
}

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export default function Sessions() {
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const claims = decodeJwt(session.access_token) ?? {};
      setInfo({
        userId: session.user.id,
        email: session.user.email ?? "—",
        provider: (session.user.app_metadata?.provider as string) ?? "email",
        aal: (claims.aal as string) ?? "aal1",
        amr: ((claims.amr ?? []) as Array<{ method: string }>).map((a) => a.method ?? String(a)),
        expiresAt: new Date((claims.exp ?? 0) * 1000).toLocaleString(),
        issuedAt: new Date((claims.iat ?? 0) * 1000).toLocaleString(),
      });
      setLoading(false);
    })();
  }, []);

  const signOutGlobal = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setSigningOut(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Signed out from all devices");
      navigate("/auth", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="sessions-loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!info) {
    return <p className="text-sm text-muted-foreground">No active session.</p>;
  }

  return (
    <div className="space-y-6" data-testid="sessions-page">
      <Card>
        <CardHeader>
          <CardTitle>Current Session</CardTitle>
          <CardDescription>JWT claims decoded from your access token</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Email" value={info.email} />
          <Row label="User ID" value={<code className="font-mono text-xs">{info.userId}</code>} />
          <Row label="Provider" value={<Badge variant="secondary">{info.provider}</Badge>} />
          <Row
            label="AAL (Assurance Level)"
            value={
              <Badge variant={info.aal === "aal2" ? "default" : "secondary"} data-testid="session-aal">
                {info.aal.toUpperCase()}
              </Badge>
            }
          />
          <Row
            label="AMR (Auth methods)"
            value={
              <div className="flex flex-wrap gap-1">
                {info.amr.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  info.amr.map((m) => (
                    <Badge key={m} variant="outline">
                      {m}
                    </Badge>
                  ))
                )}
              </div>
            }
          />
          <Row label="Issued at" value={info.issuedAt} />
          <Row label="Expires at" value={info.expiresAt} />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Global sign-out</CardTitle>
          <CardDescription>Revoke all refresh tokens across every device for this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOutGlobal} disabled={signingOut} data-testid="signout-global">
            {signingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sign out everywhere
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">{value}</div>
    </div>
  );
}

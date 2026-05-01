import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, KeyRound, Building2, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Posture {
  mfaEnrolled: boolean;
  aal: string;
  provider: string;
}

export default function SecurityOverview() {
  const [p, setP] = useState<Posture | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: factors }, { data: aal }, { data: { user } }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.getUser(),
      ]);
      const verifiedTotp = (factors?.totp ?? []).filter((f) => f.status === "verified");
      setP({
        mfaEnrolled: verifiedTotp.length > 0,
        aal: aal?.currentLevel ?? "aal1",
        provider: (user?.app_metadata?.provider as string) ?? "email",
      });
    })();
  }, []);

  const score =
    (p?.mfaEnrolled ? 50 : 0) +
    (p?.aal === "aal2" ? 30 : 0) +
    (p?.provider !== "email" ? 20 : 10);

  return (
    <div className="space-y-6" data-testid="security-overview">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Posture</CardTitle>
              <CardDescription>Live snapshot of your account hardening</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold" data-testid="posture-score">{score}</div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <PostureItem
            ok={!!p?.mfaEnrolled}
            label="MFA enrolled"
            detail={p?.mfaEnrolled ? "TOTP verified" : "No factor enrolled"}
            testid="posture-mfa"
          />
          <PostureItem
            ok={p?.aal === "aal2"}
            label="Session AAL"
            detail={(p?.aal ?? "—").toUpperCase()}
            testid="posture-aal"
          />
          <PostureItem
            ok={p?.provider !== "email"}
            label="Auth provider"
            detail={p?.provider ?? "—"}
            testid="posture-provider"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={KeyRound}
          title="MFA (TOTP)"
          desc="Time-based one-time codes via Authenticator apps. NIST SP 800-63B AAL2."
          to="/security/mfa"
          testid="card-mfa"
        />
        <FeatureCard
          icon={Building2}
          title="Enterprise SSO"
          desc="SAML 2.0 with Okta, Azure AD/Entra ID, OneLogin. Domain-restricted login."
          to="/security/sso"
          testid="card-sso"
        />
        <FeatureCard
          icon={Activity}
          title="Active Sessions"
          desc="Inspect current session, JWT claims and revoke globally."
          to="/security/sessions"
          testid="card-sessions"
        />
      </div>
    </div>
  );
}

function PostureItem({ ok, label, detail, testid }: { ok: boolean; label: string; detail: string; testid: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3" data-testid={testid}>
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
      )}
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  to,
  testid,
}: {
  icon: typeof ShieldCheck;
  title: string;
  desc: string;
  to: string;
  testid: string;
}) {
  return (
    <Card data-testid={testid}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{desc}</p>
        <Button asChild size="sm" variant="outline">
          <Link to={to}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

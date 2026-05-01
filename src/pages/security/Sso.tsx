import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ACS_URL = "https://ejjtxrctxikoqnavbtjf.supabase.co/auth/v1/sso/saml/acs";
const ENTITY_ID = "https://ejjtxrctxikoqnavbtjf.supabase.co/auth/v1/sso/saml/metadata";

export default function Sso() {
  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied");
  };

  return (
    <div className="space-y-6" data-testid="sso-page">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>SAML 2.0 Single Sign-On</CardTitle>
            <Badge variant="secondary">Enterprise</Badge>
          </div>
          <CardDescription>
            Compliant with NIST SP 800-63C, federates with Okta, Azure AD/Entra ID, OneLogin, JumpCloud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              SSO configuration is managed at the platform level. Ask your administrator to register your IdP via the
              backend dashboard, then users from whitelisted email domains can sign in seamlessly.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Service Provider details (give to your IdP)</h3>
            <CopyRow label="ACS URL" value={ACS_URL} onCopy={copy} testid="sp-acs" />
            <CopyRow label="Entity ID / SP Metadata" value={ENTITY_ID} onCopy={copy} testid="sp-entity" />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Tested IdPs</h3>
            <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              <li>• Okta (Workforce Identity)</li>
              <li>• Microsoft Entra ID (Azure AD)</li>
              <li>• OneLogin</li>
              <li>• JumpCloud</li>
              <li>• Google Workspace SAML</li>
              <li>• PingFederate / PingOne</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">QA test scenarios covered</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ SP-initiated login with domain hint</li>
              <li>✓ IdP-initiated login (deep links)</li>
              <li>✓ Just-in-time (JIT) user provisioning</li>
              <li>✓ Session AAL elevation after MFA at IdP</li>
              <li>✓ SLO (Single Logout) propagation</li>
              <li>✓ Replay-attack & assertion-tampering negative tests</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a
                href="https://www.rfc-editor.org/rfc/rfc7522"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-rfc"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                SAML Bearer (RFC 7522)
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  testid,
}: {
  label: string;
  value: string;
  onCopy: (s: string) => void;
  testid: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2" data-testid={testid}>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <code className="block truncate font-mono text-xs">{value}</code>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onCopy(value)}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

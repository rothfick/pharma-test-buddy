import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ShieldCheck, KeyRound, Building2, Activity } from "lucide-react";

const tabs = [
  { to: "/security", end: true, label: "Overview", icon: ShieldCheck, testid: "sec-nav-overview" },
  { to: "/security/mfa", label: "MFA (TOTP)", icon: KeyRound, testid: "sec-nav-mfa" },
  { to: "/security/sso", label: "Enterprise SSO", icon: Building2, testid: "sec-nav-sso" },
  { to: "/security/sessions", label: "Sessions", icon: Activity, testid: "sec-nav-sessions" },
];

export default function SecurityLayout() {
  return (
    <div className="space-y-6" data-testid="security-layout">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Center</h1>
        <p className="text-muted-foreground">
          Multi-factor authentication, enterprise SSO and active sessions — built for regulated environments.
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            data-testid={t.testid}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors -mb-px",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

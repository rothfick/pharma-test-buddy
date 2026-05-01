import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Zap, Gauge, Target, Activity } from "lucide-react";

const tabs = [
  { to: "/chaos", end: true, label: "Overview", icon: Activity, testid: "chaos-nav-overview" },
  { to: "/chaos/experiments", label: "Chaos Experiments", icon: Zap, testid: "chaos-nav-experiments" },
  { to: "/chaos/perf", label: "Performance Lab", icon: Gauge, testid: "chaos-nav-perf" },
  { to: "/chaos/slo", label: "SLOs", icon: Target, testid: "chaos-nav-slo" },
];

export default function ChaosLayout() {
  return (
    <div className="space-y-6" data-testid="chaos-layout">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chaos & Performance Lab</h1>
        <p className="text-muted-foreground">
          Resilience testing, load benchmarks and SLO tracking — Netflix-style chaos engineering.
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

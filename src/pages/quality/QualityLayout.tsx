import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Activity, GitBranch, AlertTriangle, BarChart3, Triangle } from "lucide-react";

const tabs = [
  { to: "/quality-metrics", label: "Overview", icon: BarChart3, end: true, testid: "qm-overview" },
  { to: "/quality-metrics/dora", label: "DORA Four Keys", icon: GitBranch, testid: "qm-dora" },
  { to: "/quality-metrics/pyramid", label: "Test Pyramid", icon: Triangle, testid: "qm-pyramid" },
  { to: "/quality-metrics/flaky", label: "Flaky Tests", icon: AlertTriangle, testid: "qm-flaky" },
  { to: "/quality-metrics/coverage", label: "Coverage", icon: Activity, testid: "qm-coverage" },
];

export default function QualityLayout() {
  return (
    <div className="space-y-6" data-testid="quality-layout">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quality Metrics</h1>
        <p className="text-muted-foreground">
          DORA Four Keys, test pyramid, flakiness and coverage. Ingest endpoint: <code className="text-xs">/functions/v1/metrics-ingest</code>
        </p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            data-testid={t.testid}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
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

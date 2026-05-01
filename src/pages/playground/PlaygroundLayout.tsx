import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Activity,
  FileUp,
  MousePointer2,
  ShieldAlert,
  Languages,
  Boxes,
  ListChecks,
  Wrench,
} from "lucide-react";

const subNav = [
  { to: "/playground", end: true, label: "Overview", icon: Boxes, testid: "sub-overview" },
  { to: "/playground/interactions", label: "UI interactions", icon: MousePointer2, testid: "sub-interactions" },
  { to: "/playground/async", label: "Async & race", icon: Activity, testid: "sub-async" },
  { to: "/playground/files", label: "Files & media", icon: FileUp, testid: "sub-files" },
  { to: "/playground/security", label: "Auth & security", icon: ShieldAlert, testid: "sub-security" },
  { to: "/playground/a11y", label: "A11y & i18n", icon: Languages, testid: "sub-a11y" },
  { to: "/playground/legacy", label: "Legacy targets", icon: Wrench, testid: "sub-legacy" },
  { to: "/playground/all", label: "All Challenges (111)", icon: ListChecks, testid: "sub-all" },
];

export default function PlaygroundLayout() {
  return (
    <div className="space-y-6" data-testid="playground-layout">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">QA Playground</h1>
        <p className="text-muted-foreground">
          Wymagające komponenty do treningu Playwrighta — każda sekcja w osobnej podstronie.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" data-testid="playground-subnav">
        {subNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-testid={item.testid}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}

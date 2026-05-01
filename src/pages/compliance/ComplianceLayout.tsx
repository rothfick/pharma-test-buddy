import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollText, FileSignature, ShieldCheck, ClipboardCheck, LayoutGrid } from "lucide-react";

const subNav = [
  { to: "/compliance", end: true, label: "Overview", icon: LayoutGrid, testid: "comp-overview" },
  { to: "/compliance/audit-trail", label: "Audit Trail", icon: ScrollText, testid: "comp-audit" },
  { to: "/compliance/e-signatures", label: "E-Signatures", icon: FileSignature, testid: "comp-esig" },
  { to: "/compliance/data-integrity", label: "Data Integrity (ALCOA+)", icon: ShieldCheck, testid: "comp-alcoa" },
  { to: "/compliance/validation", label: "IQ / OQ / PQ", icon: ClipboardCheck, testid: "comp-val" },
];

export default function ComplianceLayout() {
  return (
    <div className="space-y-6" data-testid="compliance-layout">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance Hub — GxP / 21 CFR Part 11</h1>
        <p className="text-muted-foreground">
          Audit trail z chain integrity, podpisy elektroniczne, ALCOA+ i walidacja systemu.
          Wszystko gotowe do testów E2E pod systemy krytyczne (pharma, medtech, life sciences).
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" data-testid="compliance-subnav">
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

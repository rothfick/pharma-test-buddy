import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Activity, Wand2, Wrench, Bug, ImageIcon, Bot, BookOpen,
  Beaker, Shield, LayoutGrid, Swords, DollarSign,
} from "lucide-react";

const subNav = [
  { to: "/ai", end: true, label: "Overview", icon: LayoutGrid, testid: "ai-overview" },
  { to: "/ai/observability", label: "Observability", icon: Activity, testid: "ai-obs" },
  { to: "/ai/test-generator", label: "Test Generator", icon: Wand2, testid: "ai-testgen" },
  { to: "/ai/self-healing", label: "Self-healing", icon: Wrench, testid: "ai-heal" },
  { to: "/ai/bug-triage", label: "Bug Triage", icon: Bug, testid: "ai-triage" },
  { to: "/ai/visual-diff", label: "Visual Diff", icon: ImageIcon, testid: "ai-vdiff" },
  { to: "/ai/agents", label: "Agent Crew", icon: Bot, testid: "ai-agents" },
  { to: "/ai/rag", label: "RAG Q&A", icon: BookOpen, testid: "ai-rag" },
  { to: "/ai/evals", label: "Evals", icon: Beaker, testid: "ai-evals" },
  { to: "/ai/guardrails", label: "Guardrails", icon: Shield, testid: "ai-guard" },
  { to: "/ai/prompt-playground", label: "Prompt Playground", icon: Swords, testid: "ai-pp" },
  { to: "/ai/cost-tracker", label: "Cost Tracker", icon: DollarSign, testid: "ai-cost" },
];

export default function AILabLayout() {
  return (
    <div className="space-y-6" data-testid="ai-layout">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Lab</h1>
        <p className="text-muted-foreground">
          GenAI, agentic workflows i LLM infrastructure — wszystko widoczne i mierzalne.
        </p>
      </div>

      <nav
        className="flex flex-wrap gap-2 border-b border-border pb-3"
        data-testid="ai-subnav"
      >
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

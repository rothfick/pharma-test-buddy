import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Wand2, Wrench, Bug, ImageIcon, Bot, BookOpen, Beaker, Shield,
} from "lucide-react";

const sections = [
  {
    to: "/ai/observability", title: "LLM Observability",
    desc: "Trace każdego wywołania: model, tokeny, koszt USD, latencja, cache hit. Fundament infry.",
    icon: Activity, status: "live", testid: "ai-card-obs",
  },
  {
    to: "/ai/test-generator", title: "Playwright Test Generator",
    desc: "User story / screenshot → gotowy test TS z Page Object. Streaming + structured output.",
    icon: Wand2, status: "live", testid: "ai-card-testgen",
  },
  {
    to: "/ai/self-healing", title: "Self-healing Selectors",
    desc: "Failujący selektor + DOM snapshot → naprawa + uzasadnienie. Klasyczny QA agentic use case.",
    icon: Wrench, status: "live", testid: "ai-card-heal",
  },
  {
    to: "/ai/bug-triage", title: "Bug Triage",
    desc: "Stacktrace / log / HAR → klasyfikacja (flaky/regression/env/data) + root cause hypothesis.",
    icon: Bug, status: "live", testid: "ai-card-triage",
  },
  {
    to: "/ai/visual-diff", title: "Visual Diff (multimodal)",
    desc: "Dwa screenshoty → Gemini Pro ocenia: bug vs intended change. Killer feature dla Playwright.",
    icon: ImageIcon, status: "live", testid: "ai-card-vdiff",
  },
  {
    to: "/ai/agents", title: "Agent Crew",
    desc: "Planner → Explorer → Writer → Critic z tool calling. Live timeline + handoffs przez Realtime.",
    icon: Bot, status: "soon", testid: "ai-card-agents",
  },
  {
    to: "/ai/rag", title: "RAG nad dokumentacją",
    desc: "Upload PDF/MD → pgvector embeddings → Q&A z cytowaniami. Z guardrailsem na halucynacje.",
    icon: BookOpen, status: "soon", testid: "ai-card-rag",
  },
  {
    to: "/ai/evals", title: "Eval Harness",
    desc: "Datasety, metryki accuracy/latency/cost, A/B promptów, rejestr wersji.",
    icon: Beaker, status: "soon", testid: "ai-card-evals",
  },
  {
    to: "/ai/guardrails", title: "Guardrails Playground",
    desc: "Prompt injection demos, PII redaction, schema validation, jailbreak attempts.",
    icon: Shield, status: "soon", testid: "ai-card-guard",
  },
];

export default function AIOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="ai-overview">
      {sections.map((s) => (
        <Link key={s.to} to={s.to} data-testid={s.testid} className="block">
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                  <s.icon className="h-4 w-4" />
                </div>
                <Badge variant={s.status === "live" ? "default" : "secondary"}>
                  {s.status === "live" ? "live" : "next"}
                </Badge>
              </div>
              <CardTitle className="text-lg">{s.title}</CardTitle>
              <CardDescription>{s.desc}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

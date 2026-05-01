import {
  Flame,
  Lock,
  History,
  Workflow,
  Eye,
  Image as ImageIcon,
  PlugZap,
  Gauge,
  ShieldAlert,
  Smartphone,
  ScrollText,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { PwCategory } from "./playwright-tests";

export interface CategoryStyle {
  icon: LucideIcon;
  // Tailwind utility fragments using semantic tokens / arbitrary HSL of tokens
  gradient: string; // gradient bg
  text: string; // text color
  ring: string; // border / ring color
  dot: string; // small dot bg
  soft: string; // soft tinted background
}

export const CATEGORY_STYLES: Record<PwCategory, CategoryStyle> = {
  Smoke: {
    icon: Flame,
    gradient: "from-orange-500/80 to-rose-500/80",
    text: "text-orange-500",
    ring: "border-orange-500/40",
    dot: "bg-orange-500",
    soft: "bg-orange-500/10",
  },
  "Auth & MFA": {
    icon: Lock,
    gradient: "from-blue-500/80 to-indigo-500/80",
    text: "text-blue-500",
    ring: "border-blue-500/40",
    dot: "bg-blue-500",
    soft: "bg-blue-500/10",
  },
  Regression: {
    icon: History,
    gradient: "from-cyan-500/80 to-sky-500/80",
    text: "text-cyan-500",
    ring: "border-cyan-500/40",
    dot: "bg-cyan-500",
    soft: "bg-cyan-500/10",
  },
  "E2E Journeys": {
    icon: Workflow,
    gradient: "from-violet-500/80 to-fuchsia-500/80",
    text: "text-violet-500",
    ring: "border-violet-500/40",
    dot: "bg-violet-500",
    soft: "bg-violet-500/10",
  },
  Accessibility: {
    icon: Eye,
    gradient: "from-emerald-500/80 to-teal-500/80",
    text: "text-emerald-500",
    ring: "border-emerald-500/40",
    dot: "bg-emerald-500",
    soft: "bg-emerald-500/10",
  },
  Visual: {
    icon: ImageIcon,
    gradient: "from-pink-500/80 to-rose-500/80",
    text: "text-pink-500",
    ring: "border-pink-500/40",
    dot: "bg-pink-500",
    soft: "bg-pink-500/10",
  },
  API: {
    icon: PlugZap,
    gradient: "from-amber-500/80 to-orange-500/80",
    text: "text-amber-500",
    ring: "border-amber-500/40",
    dot: "bg-amber-500",
    soft: "bg-amber-500/10",
  },
  Performance: {
    icon: Gauge,
    gradient: "from-yellow-500/80 to-amber-500/80",
    text: "text-yellow-500",
    ring: "border-yellow-500/40",
    dot: "bg-yellow-500",
    soft: "bg-yellow-500/10",
  },
  Security: {
    icon: ShieldAlert,
    gradient: "from-red-500/80 to-rose-600/80",
    text: "text-red-500",
    ring: "border-red-500/40",
    dot: "bg-red-500",
    soft: "bg-red-500/10",
  },
  Mobile: {
    icon: Smartphone,
    gradient: "from-teal-500/80 to-cyan-500/80",
    text: "text-teal-500",
    ring: "border-teal-500/40",
    dot: "bg-teal-500",
    soft: "bg-teal-500/10",
  },
  "Compliance (21 CFR Part 11)": {
    icon: ScrollText,
    gradient: "from-slate-500/80 to-zinc-600/80",
    text: "text-slate-400",
    ring: "border-slate-500/40",
    dot: "bg-slate-500",
    soft: "bg-slate-500/10",
  },
  "Chaos / Resilience": {
    icon: Zap,
    gradient: "from-fuchsia-500/80 to-purple-600/80",
    text: "text-fuchsia-500",
    ring: "border-fuchsia-500/40",
    dot: "bg-fuchsia-500",
    soft: "bg-fuchsia-500/10",
  },
};

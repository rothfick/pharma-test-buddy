import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, FileUp, MousePointer2, ShieldAlert, Languages, Beaker } from "lucide-react";

const sections = [
  {
    to: "/playground/interactions",
    title: "UI interactions",
    desc: "Drag & drop, resize, hover menu, context menu, canvas, slider precyzyjny.",
    icon: MousePointer2,
    testid: "card-interactions",
  },
  {
    to: "/playground/async",
    title: "Async & race conditions",
    desc: "Auto-save z debounce, optimistic UI z rollbackiem, polling, realtime chat, toasty.",
    icon: Activity,
    testid: "card-async",
  },
  {
    to: "/playground/files",
    title: "Files & media",
    desc: "Upload drag&drop, download CSV/PDF, podgląd obrazka, clipboard read/write.",
    icon: FileUp,
    testid: "card-files",
  },
  {
    to: "/playground/security",
    title: "Auth & security edge cases",
    desc: "Wygasająca sesja, OTP, captcha mock, rate limit, reauth modal.",
    icon: ShieldAlert,
    testid: "card-security",
  },
  {
    to: "/playground/a11y",
    title: "Accessibility & i18n",
    desc: "Targety pod axe-core + przełącznik PL/EN/AR z obsługą RTL.",
    icon: Languages,
    testid: "card-a11y",
  },
  {
    to: "/playground/legacy",
    title: "Legacy targets",
    desc: "API tester, flaky component, infinite scroll, Shadow DOM, iframe.",
    icon: Beaker,
    testid: "card-legacy",
  },
];

export default function Overview() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="playground-overview">
      {sections.map((s) => (
        <Link key={s.to} to={s.to} data-testid={s.testid} className="block">
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                <s.icon className="h-4 w-4" />
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

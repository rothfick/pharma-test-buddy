import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, FileSignature, ShieldCheck, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  {
    to: "/compliance/audit-trail",
    title: "Audit Trail",
    icon: ScrollText,
    desc: "Niezmienny dziennik zdarzeń z chain-hash integrity. Każda akcja podpisana SHA-256 łańcuchem.",
    badge: "21 CFR §11.10(e)",
  },
  {
    to: "/compliance/e-signatures",
    title: "Electronic Signatures",
    icon: FileSignature,
    desc: "Podpisy elektroniczne z re-autentykacją hasłem, znaczeniem podpisu i opcjonalnym świadkiem.",
    badge: "21 CFR §11.200",
  },
  {
    to: "/compliance/data-integrity",
    title: "Data Integrity (ALCOA+)",
    icon: ShieldCheck,
    desc: "Live wskaźniki: Attributable, Legible, Contemporaneous, Original, Accurate + Complete, Consistent, Enduring, Available.",
    badge: "FDA / EMA / WHO",
  },
  {
    to: "/compliance/validation",
    title: "Validation (IQ/OQ/PQ)",
    icon: ClipboardCheck,
    desc: "Kwalifikacja instalacyjna, operacyjna i wydajnościowa. Status każdego testu walidacyjnego.",
    badge: "GAMP 5",
  },
];

export default function ComplianceOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="compliance-overview">
      {cards.map((c) => (
        <Link key={c.to} to={c.to} data-testid={`comp-card-${c.title.toLowerCase().replace(/\s+/g, "-")}`}>
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <c.icon className="h-6 w-6 text-primary" />
                <Badge variant="secondary">{c.badge}</Badge>
              </div>
              <CardTitle className="mt-2">{c.title}</CardTitle>
              <CardDescription>{c.desc}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </Link>
      ))}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CHALLENGES,
  CHALLENGES_TOTAL,
  CATEGORY_LABELS,
  type ChallengeCategory,
} from "@/lib/playground-challenges";
import { ChallengeGrid } from "@/components/playground/ChallengeCard";
import { ListChecks } from "lucide-react";

const ALL: (ChallengeCategory | "all")[] = [
  "all",
  "interactions",
  "async",
  "files",
  "security",
  "a11y",
  "legacy",
  "misc",
];

export default function AllChallenges() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof ALL)[number]>("all");

  const filtered = useMemo(() => {
    return CHALLENGES.filter((c) => {
      if (cat !== "all" && c.category !== cat) return false;
      if (!q) return true;
      const haystack = `${c.id} ${c.label} ${c.kind} ${c.category}`.toLowerCase();
      return haystack.includes(q.toLowerCase());
    });
  }, [q, cat]);

  return (
    <div className="space-y-4" data-testid="all-challenges-page">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                All Challenges ({CHALLENGES_TOTAL})
              </CardTitle>
              <CardDescription>
                Pełna lista 111 mini-zadanek do treningu Playwrighta. Filtruj po tekście / kategorii.
              </CardDescription>
            </div>
            <Badge variant="outline" data-testid="all-challenges-count">
              showing {filtered.length} / {CHALLENGES_TOTAL}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj po id, etykiecie, typie…"
            data-testid="all-challenges-filter"
          />
          <div className="flex flex-wrap gap-1.5">
            {ALL.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={cat === c ? "default" : "outline"}
                onClick={() => setCat(c)}
                data-testid={`all-challenges-cat-${c}`}
              >
                {c === "all" ? "All" : CATEGORY_LABELS[c]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ChallengeGrid items={filtered} />
    </div>
  );
}

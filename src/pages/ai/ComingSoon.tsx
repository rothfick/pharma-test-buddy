import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function ComingSoon({
  title, description, plan,
}: { title: string; description: string; plan: string[] }) {
  return (
    <Card data-testid="ai-coming-soon">
      <CardHeader>
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Sparkles className="h-4 w-4" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-sm font-medium">Plan implementacji:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {plan.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

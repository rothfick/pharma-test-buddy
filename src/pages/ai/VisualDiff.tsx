import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VerdictResult {
  verdict: "bug" | "intended" | "needs_review";
  severity: "none" | "minor" | "major" | "critical";
  summary: string;
  differences: string[];
  confidence: number;
}

const verdictColor: Record<string, string> = {
  bug: "destructive", intended: "default", needs_review: "secondary",
};

function ImagePicker({
  label, value, onChange, testid,
}: { label: string; value: string | null; onChange: (v: string | null) => void; testid: string }) {
  const onFile = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Plik > 4MB — wybierz mniejszy");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <label className="cursor-pointer">
          <input
            type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            data-testid={`${testid}-input`}
          />
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/80">
            <Upload className="h-3 w-3" /> Upload
          </span>
        </label>
      </div>
      <div
        className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/30"
        data-testid={`${testid}-preview`}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">brak obrazu</span>
        )}
      </div>
    </div>
  );
}

export default function VisualDiff() {
  const [baseline, setBaseline] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerdictResult | null>(null);

  const compare = async () => {
    if (!baseline || !current) {
      toast.error("Wgraj oba obrazy");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("llm-gateway", {
        body: {
          feature: "visual-diff",
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content:
                "You are a senior visual QA engineer. Compare baseline vs current screenshot. Determine if differences are bugs (broken layout, missing elements, contrast issues) or intended (new features, copy changes, themed colors). Always call the visual_verdict function.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "BASELINE (left) vs CURRENT (right):" },
                { type: "image_url", image_url: { url: baseline } },
                { type: "image_url", image_url: { url: current } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "visual_verdict",
                description: "Compare two UI screenshots",
                parameters: {
                  type: "object",
                  properties: {
                    verdict: { type: "string", enum: ["bug", "intended", "needs_review"] },
                    severity: { type: "string", enum: ["none", "minor", "major", "critical"] },
                    summary: { type: "string" },
                    differences: { type: "array", items: { type: "string" }, maxItems: 6 },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                  required: ["verdict", "severity", "summary", "differences", "confidence"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "visual_verdict" } },
        },
      });
      if (error) throw error;
      const call = (data as any)?.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) throw new Error("Model did not return verdict");
      setResult(JSON.parse(call.function.arguments));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="ai-visual-diff">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" /> Multimodal visual diff
          </CardTitle>
          <CardDescription>
            Gemini 2.5 Pro porównuje dwa screenshoty i decyduje: bug vs intended.
            Lepsze niż pixel-diff bo rozumie semantykę zmian.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ImagePicker label="Baseline" value={baseline} onChange={setBaseline} testid="vdiff-baseline" />
            <ImagePicker label="Current" value={current} onChange={setCurrent} testid="vdiff-current" />
          </div>
          <Button
            onClick={compare} disabled={loading || !baseline || !current}
            data-testid="vdiff-compare"
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comparing…</>
              : <><ImageIcon className="mr-2 h-4 w-4" /> Compare</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card data-testid="vdiff-result">
          <CardHeader>
            <CardTitle className="text-base">Verdict</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={verdictColor[result.verdict] as any}>
                {result.verdict.replace("_", " ")}
              </Badge>
              <Badge variant="outline">severity: {result.severity}</Badge>
              <Badge variant="secondary">
                confidence {(result.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <p className="text-sm">{result.summary}</p>
            {result.differences?.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Wykryte różnice
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {result.differences.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Generic renderer for Playground "challenges". One component handles every
// challenge kind from src/lib/playground-challenges.ts. Each interactive
// element has a deterministic data-testid: `${challenge.testId}-${slot}` so
// tests and the Playground Tour can target them reliably.

import { useEffect, useRef, useState } from "react";
import type { Challenge } from "@/lib/playground-challenges";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, Check, Hash } from "lucide-react";
import { toast } from "sonner";

interface Props {
  challenge: Challenge;
}

const SWATCHES = ["bg-red-500", "bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-purple-500"];
const SELECT_OPTIONS = ["alpha", "beta", "gamma", "delta"];
const FRUITS = ["apple", "banana", "cherry", "grape", "pineapple", "strawberry"];

export function ChallengeCard({ challenge }: Props) {
  return (
    <Card data-testid={challenge.testId} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            <Hash className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
            <span data-testid={`${challenge.testId}-id`}>{challenge.id}</span>{" "}
            · {challenge.label}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {challenge.kind}
          </Badge>
        </div>
        {challenge.hint && (
          <CardDescription className="text-xs">{challenge.hint}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ChallengeBody challenge={challenge} />
      </CardContent>
    </Card>
  );
}

function ChallengeBody({ challenge }: Props) {
  const t = challenge.testId;
  switch (challenge.kind) {
    case "click-counter":
      return <ClickCounter testId={t} />;
    case "toggle":
      return <ToggleSwitch testId={t} />;
    case "checkbox":
      return <CheckboxOne testId={t} />;
    case "radio-group":
      return <RadioPick testId={t} />;
    case "text-input":
      return <TextInputAssert testId={t} />;
    case "number-input":
      return <NumberStepper testId={t} />;
    case "select":
      return <SelectOne testId={t} />;
    case "tabs":
      return <TabsWidget testId={t} />;
    case "accordion":
      return <AccordionWidget testId={t} />;
    case "dialog":
      return <DialogWidget testId={t} />;
    case "popover":
      return <PopoverWidget testId={t} />;
    case "tooltip-hover":
      return <TooltipHover testId={t} />;
    case "color-picker":
      return <ColorPicker testId={t} />;
    case "rating":
      return <Rating testId={t} />;
    case "copy-button":
      return <CopyButton testId={t} />;
    case "delayed-button":
      return <DelayedButton testId={t} />;
    case "confirm-button":
      return <ConfirmButton testId={t} />;
    case "long-press":
      return <LongPress testId={t} />;
    case "scroll-into-view":
      return <ScrollIntoView testId={t} />;
    case "lazy-image":
      return <LazyImage testId={t} />;
    case "stepper-form":
      return <StepperForm testId={t} />;
    case "filter-list":
      return <FilterList testId={t} />;
  }
}

// ---------- individual widgets ----------

function ClickCounter({ testId }: { testId: string }) {
  const [n, setN] = useState(0);
  return (
    <div className="flex items-center justify-between">
      <Button size="sm" data-testid={`${testId}-btn`} onClick={() => setN((v) => v + 1)}>
        Click me
      </Button>
      <span className="text-sm">
        count: <b data-testid={`${testId}-count`}>{n}</b>
      </span>
    </div>
  );
}

function ToggleSwitch({ testId }: { testId: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <Switch checked={on} onCheckedChange={setOn} data-testid={`${testId}-switch`} />
      <span className="text-sm">
        state: <b data-testid={`${testId}-state`}>{on ? "on" : "off"}</b>
      </span>
    </div>
  );
}

function CheckboxOne({ testId }: { testId: string }) {
  const [c, setC] = useState(false);
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={c} onCheckedChange={(v) => setC(v === true)} data-testid={`${testId}-cb`} />
      <span data-testid={`${testId}-label`}>Accept terms ({c ? "yes" : "no"})</span>
    </label>
  );
}

function RadioPick({ testId }: { testId: string }) {
  const [v, setV] = useState("a");
  return (
    <RadioGroup value={v} onValueChange={setV} data-testid={`${testId}-group`}>
      {["a", "b", "c"].map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm">
          <RadioGroupItem value={o} data-testid={`${testId}-opt-${o}`} />
          Option {o.toUpperCase()}
        </label>
      ))}
      <span className="mt-1 text-xs text-muted-foreground">
        value: <b data-testid={`${testId}-value`}>{v}</b>
      </span>
    </RadioGroup>
  );
}

function TextInputAssert({ testId }: { testId: string }) {
  const [v, setV] = useState("");
  return (
    <div className="space-y-1">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="type here" data-testid={`${testId}-input`} />
      <span className="text-xs text-muted-foreground">
        value: <b data-testid={`${testId}-value`}>{v || "·"}</b>
      </span>
    </div>
  );
}

function NumberStepper({ testId }: { testId: string }) {
  const [n, setN] = useState(0);
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setN((v) => v - 1)} data-testid={`${testId}-dec`}>−</Button>
      <span className="min-w-[2rem] text-center font-mono" data-testid={`${testId}-value`}>{n}</span>
      <Button size="sm" variant="outline" onClick={() => setN((v) => v + 1)} data-testid={`${testId}-inc`}>+</Button>
    </div>
  );
}

function SelectOne({ testId }: { testId: string }) {
  const [v, setV] = useState(SELECT_OPTIONS[0]);
  return (
    <div className="space-y-1">
      <Select value={v} onValueChange={setV}>
        <SelectTrigger data-testid={`${testId}-trigger`} className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SELECT_OPTIONS.map((o) => (
            <SelectItem key={o} value={o} data-testid={`${testId}-item-${o}`}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">
        value: <b data-testid={`${testId}-value`}>{v}</b>
      </span>
    </div>
  );
}

function TabsWidget({ testId }: { testId: string }) {
  return (
    <Tabs defaultValue="t1">
      <TabsList data-testid={`${testId}-tabs`}>
        <TabsTrigger value="t1" data-testid={`${testId}-tab-1`}>One</TabsTrigger>
        <TabsTrigger value="t2" data-testid={`${testId}-tab-2`}>Two</TabsTrigger>
        <TabsTrigger value="t3" data-testid={`${testId}-tab-3`}>Three</TabsTrigger>
      </TabsList>
      <TabsContent value="t1" data-testid={`${testId}-panel-1`}>Panel 1 content</TabsContent>
      <TabsContent value="t2" data-testid={`${testId}-panel-2`}>Panel 2 content</TabsContent>
      <TabsContent value="t3" data-testid={`${testId}-panel-3`}>Panel 3 content</TabsContent>
    </Tabs>
  );
}

function AccordionWidget({ testId }: { testId: string }) {
  return (
    <Accordion type="single" collapsible data-testid={`${testId}-acc`}>
      <AccordionItem value="i1">
        <AccordionTrigger data-testid={`${testId}-trigger`}>Show details</AccordionTrigger>
        <AccordionContent data-testid={`${testId}-content`}>Hidden body text revealed.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function DialogWidget({ testId }: { testId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid={`${testId}-open`}>Open dialog</Button>
      </DialogTrigger>
      <DialogContent data-testid={`${testId}-dialog`}>
        <DialogHeader>
          <DialogTitle>Test dialog</DialogTitle>
        </DialogHeader>
        <p className="text-sm">Modal body content.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid={`${testId}-cancel`}>Cancel</Button>
          <Button onClick={() => setOpen(false)} data-testid={`${testId}-ok`}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PopoverWidget({ testId }: { testId: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`${testId}-trigger`}>Open popover</Button>
      </PopoverTrigger>
      <PopoverContent data-testid={`${testId}-content`}>Popover content.</PopoverContent>
    </Popover>
  );
}

function TooltipHover({ testId }: { testId: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="ghost" data-testid={`${testId}-trigger`}>Hover me</Button>
        </TooltipTrigger>
        <TooltipContent data-testid={`${testId}-content`}>Tooltip text</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ColorPicker({ testId }: { testId: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        {SWATCHES.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setPicked(s)}
            className={`h-6 w-6 rounded-md border ${s} ${picked === s ? "ring-2 ring-primary" : ""}`}
            data-testid={`${testId}-swatch-${i}`}
            aria-label={`swatch-${i}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        picked: <b data-testid={`${testId}-value`}>{picked ?? "—"}</b>
      </span>
    </div>
  );
}

function Rating({ testId }: { testId: string }) {
  const [n, setN] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => setN(i)}
          data-testid={`${testId}-star-${i}`}
          aria-label={`${i} stars`}
        >
          <Star className={`h-5 w-5 ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        </button>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        rating: <b data-testid={`${testId}-value`}>{n}</b>
      </span>
    </div>
  );
}

function CopyButton({ testId }: { testId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      data-testid={`${testId}-copy`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`hello-${testId}`);
        } catch {
          /* noop */
        }
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function DelayedButton({ testId }: { testId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEnabled(true), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex items-center justify-between">
      <Button size="sm" disabled={!enabled} onClick={() => setClicked(true)} data-testid={`${testId}-btn`}>
        {enabled ? "Ready" : "Loading…"}
      </Button>
      <span className="text-xs text-muted-foreground">
        clicked: <b data-testid={`${testId}-clicked`}>{clicked ? "yes" : "no"}</b>
      </span>
    </div>
  );
}

function ConfirmButton({ testId }: { testId: string }) {
  const [primed, setPrimed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const timer = useRef<number | null>(null);
  return (
    <div className="flex items-center justify-between">
      <Button
        size="sm"
        variant={primed ? "destructive" : "default"}
        data-testid={`${testId}-btn`}
        onClick={() => {
          if (primed) {
            setConfirmed(true);
            setPrimed(false);
            return;
          }
          setPrimed(true);
          timer.current && window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setPrimed(false), 1000);
        }}
      >
        {primed ? "Click again to confirm" : confirmed ? "Confirmed" : "Delete"}
      </Button>
      <span className="text-xs text-muted-foreground">
        state: <b data-testid={`${testId}-state`}>{confirmed ? "confirmed" : primed ? "primed" : "idle"}</b>
      </span>
    </div>
  );
}

function LongPress({ testId }: { testId: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  const cancel = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  return (
    <div className="flex items-center justify-between">
      <Button
        size="sm"
        variant="outline"
        data-testid={`${testId}-btn`}
        onPointerDown={() => {
          cancel();
          timer.current = window.setTimeout(() => setDone(true), 800);
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
      >
        Hold me 0.8s
      </Button>
      <span className="text-xs text-muted-foreground">
        done: <b data-testid={`${testId}-done`}>{done ? "yes" : "no"}</b>
      </span>
    </div>
  );
}

function ScrollIntoView({ testId }: { testId: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Scroll inside the panel ↓</p>
      <div className="h-24 overflow-auto rounded-md border bg-muted/30 p-2 text-xs">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <p key={i}>filler line {i + 1}</p>
          ))}
          <Button size="sm" data-testid={`${testId}-target`}>Hidden target</Button>
        </div>
      </div>
    </div>
  );
}

function LazyImage({ testId }: { testId: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex items-center gap-3">
      {shown ? (
        <div
          className="h-10 w-16 rounded-md bg-gradient-to-br from-primary to-accent"
          data-testid={`${testId}-img`}
        />
      ) : (
        <div className="h-10 w-16 animate-pulse rounded-md bg-muted" data-testid={`${testId}-skeleton`} />
      )}
      <span className="text-xs text-muted-foreground">
        loaded: <b data-testid={`${testId}-state`}>{shown ? "yes" : "no"}</b>
      </span>
    </div>
  );
}

function StepperForm({ testId }: { testId: string }) {
  const [step, setStep] = useState(1);
  return (
    <div className="space-y-2">
      <div className="text-xs">
        step <b data-testid={`${testId}-step`}>{step}</b> / 3
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)} data-testid={`${testId}-prev`}>
          Prev
        </Button>
        <Button size="sm" disabled={step === 3} onClick={() => setStep((s) => s + 1)} data-testid={`${testId}-next`}>
          Next
        </Button>
      </div>
    </div>
  );
}

function FilterList({ testId }: { testId: string }) {
  const [q, setQ] = useState("");
  const list = FRUITS.filter((f) => f.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-1">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter…" data-testid={`${testId}-input`} />
      <ul className="text-xs" data-testid={`${testId}-list`}>
        {list.map((f) => (
          <li key={f} data-testid={`${testId}-item-${f}`}>• {f}</li>
        ))}
        {list.length === 0 && <li className="text-muted-foreground">no results</li>}
      </ul>
      <span className="text-xs text-muted-foreground">
        count: <b data-testid={`${testId}-count`}>{list.length}</b>
      </span>
    </div>
  );
}

export function ChallengeGrid({ items }: { items: Challenge[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="challenge-grid">
      {items.map((c) => (
        <ChallengeCard key={c.id} challenge={c} />
      ))}
    </div>
  );
}

export { Label };

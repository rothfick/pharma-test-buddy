import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const step1Schema = z.object({
  title: z.string().trim().min(3, "At least 3 characters").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

const step2Schema = z.object({
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().optional().or(z.literal("")),
});

interface Subtask {
  id: string;
  title: string;
}

const STEPS = ["Basics", "Details", "Subtasks", "Review"] as const;

export default function Wizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");

  const next = () => {
    setErrors({});
    if (step === 0) {
      const r = step1Schema.safeParse({ title, description });
      if (!r.success) {
        const errs: Record<string, string> = {};
        r.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
        setErrors(errs);
        return;
      }
    }
    if (step === 1) {
      const r = step2Schema.safeParse({ priority, dueDate });
      if (!r.success) {
        const errs: Record<string, string> = {};
        r.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
        setErrors(errs);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((s) => [...s, { id: crypto.randomUUID(), title: newSubtask.trim() }]);
    setNewSubtask("");
  };

  const removeSubtask = (id: string) => {
    setSubtasks((s) => s.filter((t) => t.id !== id));
  };

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    const fullDescription = [
      description.trim(),
      subtasks.length > 0 ? "\n\nSubtasks:\n" + subtasks.map((s) => `- ${s.title}`).join("\n") : "",
    ]
      .filter(Boolean)
      .join("");

    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: fullDescription || null,
      priority,
      due_date: dueDate || null,
      created_by: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task created from wizard");
    navigate("/tasks");
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="wizard-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Task Wizard</h1>
        <p className="text-muted-foreground">A 4-step form with validation, dynamic fields and review</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-3">
            <CardTitle data-testid="wizard-step-title">Step {step + 1} of {STEPS.length}: {STEPS[step]}</CardTitle>
            <span className="text-sm text-muted-foreground" data-testid="wizard-progress-text">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} data-testid="wizard-progress" />
          <CardDescription className="mt-2">
            {step === 0 && "Provide the basic information"}
            {step === 1 && "Set priority and timing"}
            {step === 2 && "Add subtasks (dynamic list)"}
            {step === 3 && "Review and submit"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="space-y-4" data-testid="step-basics">
              <div className="space-y-2">
                <Label htmlFor="w-title">Title *</Label>
                <Input
                  id="w-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="wizard-title"
                />
                {errors.title && <p className="text-sm text-destructive" data-testid="error-title">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-desc">Description</Label>
                <Textarea
                  id="w-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="wizard-description"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4" data-testid="step-details">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger data-testid="wizard-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-due">Due date</Label>
                <Input
                  id="w-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="wizard-due-date"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" data-testid="step-subtasks">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a subtask..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                  data-testid="subtask-input"
                />
                <Button type="button" onClick={addSubtask} data-testid="add-subtask">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-2" data-testid="subtask-list">
                {subtasks.length === 0 && (
                  <li className="text-sm text-muted-foreground" data-testid="subtask-empty">No subtasks yet</li>
                )}
                {subtasks.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2"
                    data-testid={`subtask-${s.id}`}
                  >
                    <span>{s.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSubtask(s.id)}
                      data-testid={`remove-${s.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm" data-testid="step-review">
              <Row label="Title" value={title} testid="review-title" />
              <Row label="Description" value={description || "—"} testid="review-description" />
              <Row label="Priority" value={priority} testid="review-priority" />
              <Row label="Due date" value={dueDate || "—"} testid="review-due-date" />
              <Row label="Subtasks" value={subtasks.length === 0 ? "—" : subtasks.map((s) => s.title).join(", ")} testid="review-subtasks" />
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={back} disabled={step === 0} data-testid="wizard-back">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} data-testid="wizard-next">
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting} data-testid="wizard-submit">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Submit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2" data-testid={testid}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

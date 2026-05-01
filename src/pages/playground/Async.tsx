import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { ChallengeGrid } from "@/components/playground/ChallengeCard";
import { challengesByCategory } from "@/lib/playground-challenges";

export default function Async() {
  const bonus = challengesByCategory("async");
  return (
    <div className="space-y-6" data-testid="async-page">
      <AutoSave />
      <OptimisticUI />
      <Polling />
      <RealtimeChat />
      <ToastBurst />
      <section className="space-y-3" data-testid="async-bonus">
        <h2 className="text-lg font-semibold">Bonus challenges ({bonus.length})</h2>
        <ChallengeGrid items={bonus} />
      </section>
    </div>
  );
}

/* ---------- Auto-save with debounce ---------- */
function AutoSave() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "typing" | "saving" | "saved">("idle");
  const timer = useRef<number | null>(null);
  const savedRef = useRef("");

  useEffect(() => {
    if (text === savedRef.current) return;
    setStatus("typing");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStatus("saving");
      window.setTimeout(() => {
        savedRef.current = text;
        setStatus("saved");
      }, 600);
    }, 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [text]);

  return (
    <Card data-testid="autosave-card">
      <CardHeader>
        <CardTitle>Auto-save (debounce 800ms + save 600ms)</CardTitle>
        <CardDescription>Test stanów: typing → saving → saved. Łatwo w niego wpaść race condition.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Pisz tutaj…" data-testid="autosave-input" />
        <Badge data-testid="autosave-status" variant={status === "saved" ? "default" : "secondary"}>
          {status === "saved" && <Check className="mr-1 h-3 w-3" />}
          {status === "saving" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          status: {status}
        </Badge>
      </CardContent>
    </Card>
  );
}

/* ---------- Optimistic UI with rollback ---------- */
function OptimisticUI() {
  const [likes, setLikes] = useState(10);
  const [pending, setPending] = useState(false);

  const like = (shouldFail: boolean) => {
    setPending(true);
    setLikes((n) => n + 1);
    window.setTimeout(() => {
      if (shouldFail) {
        setLikes((n) => n - 1);
        toast.error("Server rejected — rolled back", { duration: 2000 });
      } else {
        toast.success("Confirmed");
      }
      setPending(false);
    }, 900);
  };

  return (
    <Card data-testid="optimistic-card">
      <CardHeader>
        <CardTitle>Optimistic UI z rollbackiem</CardTitle>
        <CardDescription>Liczba aktualizuje się od razu; po 900ms serwer może odrzucić zmianę.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button onClick={() => like(false)} disabled={pending} data-testid="like-success">Like (success)</Button>
        <Button onClick={() => like(true)} disabled={pending} variant="destructive" data-testid="like-fail">Like (fail)</Button>
        <Badge variant="secondary" data-testid="like-count">likes: {likes}</Badge>
      </CardContent>
    </Card>
  );
}

/* ---------- Polling ---------- */
function Polling() {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <Card data-testid="polling-card">
      <CardHeader>
        <CardTitle>Polling co 1s</CardTitle>
        <CardDescription>Tick licznika emitowany co sekundę — pod testy <code>expect.poll()</code>.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button onClick={() => setRunning((r) => !r)} data-testid="polling-toggle">
          {running ? "Stop" : "Start"}
        </Button>
        <Badge variant="secondary" data-testid="polling-tick">tick: {tick}</Badge>
      </CardContent>
    </Card>
  );
}

/* ---------- Realtime broadcast chat ---------- */
function RealtimeChat() {
  const [msg, setMsg] = useState("");
  const [log, setLog] = useState<{ id: string; text: string; ts: number }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ch = supabase.channel("qa-playground-chat", { config: { broadcast: { self: true } } });
    ch.on("broadcast", { event: "msg" }, ({ payload }) => {
      setLog((l) => [...l.slice(-49), payload as any]);
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") setConnected(true);
    });
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const send = () => {
    if (!msg.trim() || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "msg",
      payload: { id: crypto.randomUUID(), text: msg, ts: Date.now() },
    });
    setMsg("");
  };

  return (
    <Card data-testid="realtime-card">
      <CardHeader>
        <CardTitle>Realtime broadcast chat</CardTitle>
        <CardDescription>
          Otwórz tę stronę w 2 kartach — wiadomości lecą przez Lovable Cloud Realtime.
          <Badge variant={connected ? "default" : "secondary"} className="ml-2" data-testid="realtime-status">
            {connected ? "connected" : "connecting…"}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" data-testid="realtime-input" />
          <Button onClick={send} data-testid="realtime-send">Send</Button>
        </div>
        <div className="h-48 space-y-1 overflow-auto rounded-md border border-border bg-secondary/30 p-2 text-sm" data-testid="realtime-log">
          {log.map((m) => (
            <div key={m.id} data-testid="realtime-msg">
              <span className="text-muted-foreground">[{new Date(m.ts).toLocaleTimeString()}]</span> {m.text}
            </div>
          ))}
          {log.length === 0 && <div className="text-muted-foreground">Brak wiadomości</div>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Toast burst ---------- */
function ToastBurst() {
  return (
    <Card data-testid="toast-card">
      <CardHeader>
        <CardTitle>Toast burst</CardTitle>
        <CardDescription>Wyrzuca 5 toastów z różnymi czasami życia — pod testy znikających elementów.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          data-testid="toast-burst"
          onClick={() => {
            for (let i = 1; i <= 5; i++) {
              window.setTimeout(() => toast(`Toast #${i}`, { duration: 1000 + i * 500 }), i * 200);
            }
          }}
        >
          Fire 5 toasts
        </Button>
      </CardContent>
    </Card>
  );
}

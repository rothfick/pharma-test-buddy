import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Security() {
  return (
    <div className="space-y-6" data-testid="security-page">
      <SessionExpiry />
      <OtpInput />
      <CaptchaMock />
      <RateLimit />
    </div>
  );
}

/* ---------- Session expiry + reauth modal ---------- */
function SessionExpiry() {
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [expired, setExpired] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (expired) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setExpired(true);
          setReauthOpen(true);
          window.clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [expired]);

  const reauth = () => {
    setSubmitting(true);
    window.setTimeout(() => {
      if (pwd === "Passw0rd!") {
        setExpired(false);
        setSecondsLeft(20);
        setReauthOpen(false);
        setPwd("");
        toast.success("Sesja odnowiona");
      } else {
        toast.error("Złe hasło — spróbuj 'Passw0rd!'");
      }
      setSubmitting(false);
    }, 600);
  };

  return (
    <Card data-testid="session-card">
      <CardHeader>
        <CardTitle>Wygasająca sesja + reauth modal</CardTitle>
        <CardDescription>Co 20s sesja wygasa i wymusza ponowne logowanie hasłem (testowe: <code>Passw0rd!</code>).</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Badge variant={expired ? "destructive" : "secondary"} data-testid="session-status">
          {expired ? "EXPIRED" : `active (${secondsLeft}s)`}
        </Badge>
        <Button
          variant="outline"
          data-testid="session-refresh"
          disabled={!expired}
          onClick={() => setReauthOpen(true)}
        >
          Reauth
        </Button>
      </CardContent>

      <Dialog open={reauthOpen} onOpenChange={setReauthOpen}>
        <DialogContent data-testid="reauth-modal">
          <DialogHeader>
            <DialogTitle>Sesja wygasła</DialogTitle>
            <DialogDescription>Wprowadź hasło, aby kontynuować pracę.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reauth-pwd">Hasło</Label>
            <Input
              id="reauth-pwd"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              data-testid="reauth-password"
              onKeyDown={(e) => e.key === "Enter" && reauth()}
            />
          </div>
          <DialogFooter>
            <Button onClick={reauth} disabled={submitting} data-testid="reauth-submit">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zaloguj ponownie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------- OTP / 2FA input ---------- */
function OtpInput() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [verified, setVerified] = useState<null | "ok" | "fail">(null);
  const code = digits.join("");

  const setAt = (i: number, v: string) => {
    const ch = v.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = ch;
      return next;
    });
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  const verify = () => {
    setVerified(code === "123456" ? "ok" : "fail");
  };

  return (
    <Card data-testid="otp-card">
      <CardHeader>
        <CardTitle>2FA / OTP</CardTitle>
        <CardDescription>6 pól, auto-focus, paste obsłużony. Poprawny kod testowy: <code>123456</code>.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2" data-testid="otp-row">
          {digits.map((d, i) => (
            <Input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
                if (t.length) {
                  e.preventDefault();
                  setDigits((prev) => prev.map((_, idx) => t[idx] ?? ""));
                  refs.current[Math.min(t.length, 5)]?.focus();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
              }}
              inputMode="numeric"
              maxLength={1}
              className="h-12 w-12 text-center text-lg"
              data-testid={`otp-${i}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={verify} disabled={code.length !== 6} data-testid="otp-verify">Verify</Button>
          {verified === "ok" && <Badge data-testid="otp-result-ok">verified</Badge>}
          {verified === "fail" && <Badge variant="destructive" data-testid="otp-result-fail">invalid</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Captcha mock ---------- */
function CaptchaMock() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(7);
  const [val, setVal] = useState("");
  const [solved, setSolved] = useState(false);

  const reset = () => {
    setA(Math.floor(Math.random() * 9) + 1);
    setB(Math.floor(Math.random() * 9) + 1);
    setVal("");
    setSolved(false);
  };

  return (
    <Card data-testid="captcha-card">
      <CardHeader>
        <CardTitle>Captcha mock</CardTitle>
        <CardDescription>Prosty challenge matematyczny — pod testy bypass-u przez seed (ustaw deterministyczne A i B).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          Ile to <span data-testid="captcha-a">{a}</span> + <span data-testid="captcha-b">{b}</span>?
        </div>
        <div className="flex gap-2">
          <Input value={val} onChange={(e) => setVal(e.target.value)} className="w-32" data-testid="captcha-input" />
          <Button
            onClick={() => setSolved(parseInt(val) === a + b)}
            data-testid="captcha-submit"
          >
            Sprawdź
          </Button>
          <Button variant="outline" onClick={reset} data-testid="captcha-reset">Nowy</Button>
        </div>
        {solved && <Badge data-testid="captcha-solved">solved</Badge>}
      </CardContent>
    </Card>
  );
}

/* ---------- Rate limit ---------- */
function RateLimit() {
  const [hits, setHits] = useState<number[]>([]);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const LIMIT = 5;
  const WINDOW = 10_000;
  const COOLDOWN = 8_000;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const isBlocked = blockedUntil !== null && now < blockedUntil;
  const recent = hits.filter((t) => now - t < WINDOW);

  const click = () => {
    if (isBlocked) return;
    const t = Date.now();
    const next = [...hits.filter((x) => t - x < WINDOW), t];
    setHits(next);
    if (next.length >= LIMIT) {
      setBlockedUntil(t + COOLDOWN);
      toast.error(`Rate limit — odczekaj ${COOLDOWN / 1000}s`);
    }
  };

  return (
    <Card data-testid="ratelimit-card">
      <CardHeader>
        <CardTitle>Rate limit</CardTitle>
        <CardDescription>Maks {LIMIT} kliknięć / {WINDOW / 1000}s, potem cooldown {COOLDOWN / 1000}s.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button onClick={click} disabled={isBlocked} data-testid="ratelimit-btn">Kliknij mnie</Button>
        <Badge variant="secondary" data-testid="ratelimit-count">hits: {recent.length}/{LIMIT}</Badge>
        {isBlocked && (
          <Badge variant="destructive" data-testid="ratelimit-blocked">
            blocked ({Math.ceil((blockedUntil! - now) / 1000)}s)
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

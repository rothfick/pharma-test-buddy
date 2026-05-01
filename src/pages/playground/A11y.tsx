import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChallengeGrid } from "@/components/playground/ChallengeCard";
import { challengesByCategory } from "@/lib/playground-challenges";

type Lang = "pl" | "en" | "ar";

const dict: Record<Lang, Record<string, string>> = {
  pl: {
    title: "Witaj w QA Playground",
    desc: "Sekcja A11y i i18n — przełącz język i sprawdź targety dostępności.",
    submit: "Wyślij",
    name: "Imię",
    email: "E-mail",
    required: "Pole wymagane",
  },
  en: {
    title: "Welcome to QA Playground",
    desc: "A11y and i18n section — switch language and inspect accessibility targets.",
    submit: "Submit",
    name: "Name",
    email: "Email",
    required: "Field required",
  },
  ar: {
    title: "مرحبا بك في QA Playground",
    desc: "قسم إمكانية الوصول والترجمة — بدّل اللغة وافحص أهداف الوصول.",
    submit: "إرسال",
    name: "الاسم",
    email: "البريد الإلكتروني",
    required: "حقل مطلوب",
  },
};

export default function A11y() {
  const [lang, setLang] = useState<Lang>("pl");
  const t = dict[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const bonus = challengesByCategory("a11y");

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    return () => {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    };
  }, [lang, dir]);

  return (
    <div className="space-y-6" data-testid="a11y-page" dir={dir} lang={lang}>
      <Card data-testid="i18n-card">
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="lang">Język</Label>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="w-40" id="lang" data-testid="lang-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pl" data-testid="lang-pl">Polski</SelectItem>
                <SelectItem value="en" data-testid="lang-en">English</SelectItem>
                <SelectItem value="ar" data-testid="lang-ar">العربية (RTL)</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" data-testid="dir-badge">dir={dir}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="a11y-form-card">
        <CardHeader>
          <CardTitle>Formularz z aria & landmarkami</CardTitle>
          <CardDescription>
            Pod testy axe-core / <code>@axe-core/playwright</code> — etykiety, opisy błędów, role, focus management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            data-testid="a11y-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const live = form.querySelector("[data-testid='a11y-status']");
              if (live) live.textContent = "OK";
            }}
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="a11y-name">{t.name}</Label>
                <Input id="a11y-name" name="name" required aria-describedby="a11y-name-help" data-testid="a11y-name" />
                <p id="a11y-name-help" className="text-xs text-muted-foreground">{t.required}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="a11y-email">{t.email}</Label>
                <Input id="a11y-email" name="email" type="email" required aria-describedby="a11y-email-help" data-testid="a11y-email" />
                <p id="a11y-email-help" className="text-xs text-muted-foreground">{t.required}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button type="submit" data-testid="a11y-submit">{t.submit}</Button>
              <span role="status" aria-live="polite" data-testid="a11y-status" className="text-sm text-success" />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card data-testid="a11y-bad-card">
        <CardHeader>
          <CardTitle>Komponent „zły dla a11y"</CardTitle>
          <CardDescription>Celowo łamie reguły — axe powinien wyłapać błędy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* low contrast */}
          <div data-testid="a11y-bad-contrast" style={{ color: "#cccccc", background: "#dddddd" }} className="rounded p-2">
            Tekst o bardzo niskim kontraście
          </div>
          {/* missing alt */}
          <img data-testid="a11y-bad-img" src="/placeholder.svg" className="h-12 w-12" />
          {/* div as button */}
          <div
            data-testid="a11y-bad-button"
            onClick={() => {}}
            className="inline-block cursor-pointer rounded-md bg-primary px-3 py-2 text-primary-foreground"
          >
            Kliknij mnie (div, nie button)
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3" data-testid="a11y-bonus">
        <h2 className="text-lg font-semibold">Bonus challenges ({bonus.length})</h2>
        <ChallengeGrid items={bonus} />
      </section>
    </div>
  );
}

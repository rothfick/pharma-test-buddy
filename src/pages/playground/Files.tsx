import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, ClipboardCopy, ClipboardPaste, Image as ImageIcon } from "lucide-react";

export default function Files() {
  return (
    <div className="space-y-6" data-testid="files-page">
      <DropzoneUpload />
      <DownloadFiles />
      <ImagePreview />
      <Clipboard />
    </div>
  );
}

/* ---------- Drag & drop file upload (client-side, no backend) ---------- */
function DropzoneUpload() {
  const [files, setFiles] = useState<{ name: string; size: number; type: string }[]>([]);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX = 2 * 1024 * 1024; // 2MB
  const ALLOWED = ["image/png", "image/jpeg", "application/pdf", "text/csv", "text/plain"];

  const accept = (list: FileList | null) => {
    if (!list) return;
    setError("");
    const out: typeof files = [];
    for (const f of Array.from(list)) {
      if (!ALLOWED.includes(f.type)) {
        setError(`Niedozwolony typ pliku: ${f.name}`);
        return;
      }
      if (f.size > MAX) {
        setError(`Plik za duży (>2MB): ${f.name}`);
        return;
      }
      out.push({ name: f.name, size: f.size, type: f.type });
    }
    setFiles((prev) => [...prev, ...out]);
  };

  return (
    <Card data-testid="upload-card">
      <CardHeader>
        <CardTitle>File upload (drag & drop)</CardTitle>
        <CardDescription>Walidacja typu (png/jpg/pdf/csv/txt) i rozmiaru (max 2MB). Pod <code>locator.setInputFiles()</code>.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          data-testid="dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setHover(true);
          }}
          onDragLeave={() => setHover(false)}
          onDrop={(e) => {
            e.preventDefault();
            setHover(false);
            accept(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-sm transition-colors ${
            hover ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <Upload className="h-5 w-5" />
          <span>Upuść pliki tutaj lub kliknij, by wybrać</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            data-testid="file-input"
            onChange={(e) => accept(e.target.files)}
          />
        </div>
        {error && (
          <div role="alert" className="text-sm text-destructive" data-testid="upload-error">
            {error}
          </div>
        )}
        <ul className="space-y-1 text-sm" data-testid="upload-list">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded-md border border-border p-2" data-testid="upload-item">
              <span>{f.name}</span>
              <Badge variant="secondary">{Math.round(f.size / 1024)} KB</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ---------- Download CSV / TXT ---------- */
function DownloadFiles() {
  const downloadBlob = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csv = "id,title,status\n1,Write tests,todo\n2,Review PR,doing\n3,Deploy,done\n";
  const txt = "QA Playground — generated at " + new Date().toISOString();

  return (
    <Card data-testid="download-card">
      <CardHeader>
        <CardTitle>Download files</CardTitle>
        <CardDescription>Pliki generowane po stronie klienta — pod test <code>page.waitForEvent('download')</code>.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" data-testid="dl-csv" onClick={() => downloadBlob("tasks.csv", csv, "text/csv")}>
          <Download className="mr-2 h-4 w-4" /> tasks.csv
        </Button>
        <Button variant="outline" data-testid="dl-txt" onClick={() => downloadBlob("readme.txt", txt, "text/plain")}>
          <Download className="mr-2 h-4 w-4" /> readme.txt
        </Button>
        <a
          data-testid="dl-direct"
          download="hello.txt"
          href={"data:text/plain;charset=utf-8," + encodeURIComponent("hello from anchor")}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary/50"
        >
          <Download className="h-4 w-4" /> hello.txt (anchor)
        </a>
      </CardContent>
    </Card>
  );
}

/* ---------- Image preview from file ---------- */
function ImagePreview() {
  const [src, setSrc] = useState<string>("");
  return (
    <Card data-testid="preview-card">
      <CardHeader>
        <CardTitle>Image preview</CardTitle>
        <CardDescription>Wybierz obrazek — generowany podgląd przez <code>FileReader</code>.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="file"
          accept="image/*"
          data-testid="image-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => setSrc(String(reader.result));
            reader.readAsDataURL(f);
          }}
        />
        {src ? (
          <img src={src} alt="preview" className="max-h-48 rounded-md border border-border" data-testid="image-preview" />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            <ImageIcon className="mr-2 h-4 w-4" /> brak obrazka
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Clipboard ---------- */
function Clipboard() {
  const [text, setText] = useState("Lorem ipsum QA");
  const [pasted, setPasted] = useState("");

  return (
    <Card data-testid="clipboard-card">
      <CardHeader>
        <CardTitle>Clipboard</CardTitle>
        <CardDescription>Kopiuj/wklej do schowka — pod test <code>context.grantPermissions(['clipboard-read','clipboard-write'])</code>.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} data-testid="clipboard-source" />
        <div className="flex gap-2">
          <Button
            variant="outline"
            data-testid="clipboard-copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                toast.success("Skopiowano");
              } catch {
                toast.error("Brak dostępu do schowka");
              }
            }}
          >
            <ClipboardCopy className="mr-2 h-4 w-4" /> Copy
          </Button>
          <Button
            variant="outline"
            data-testid="clipboard-paste"
            onClick={async () => {
              try {
                const t = await navigator.clipboard.readText();
                setPasted(t);
              } catch {
                toast.error("Brak dostępu do schowka");
              }
            }}
          >
            <ClipboardPaste className="mr-2 h-4 w-4" /> Paste
          </Button>
        </div>
        {pasted && (
          <div className="rounded-md border border-border bg-secondary/30 p-2 text-sm" data-testid="clipboard-pasted">
            pasted: {pasted}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

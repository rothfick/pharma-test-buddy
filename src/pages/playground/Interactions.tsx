import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { GripVertical } from "lucide-react";

export default function Interactions() {
  return (
    <div className="space-y-6" data-testid="interactions-page">
      <DragAndDrop />
      <ResizableBox />
      <HoverMenu />
      <RightClickMenu />
      <CanvasDrawing />
      <PrecisionSlider />
    </div>
  );
}

/* ---------- Drag & drop (HTML5 DnD) ---------- */
function DragAndDrop() {
  const [todo, setTodo] = useState(["Write tests", "Review PR", "Deploy"]);
  const [done, setDone] = useState<string[]>([]);
  const [dragged, setDragged] = useState<{ from: "todo" | "done"; item: string } | null>(null);

  const onDrop = (target: "todo" | "done") => {
    if (!dragged) return;
    if (dragged.from === target) return;
    if (target === "done") {
      setTodo((t) => t.filter((i) => i !== dragged.item));
      setDone((d) => [...d, dragged.item]);
    } else {
      setDone((d) => d.filter((i) => i !== dragged.item));
      setTodo((t) => [...t, dragged.item]);
    }
    setDragged(null);
  };

  const Column = ({ id, items, label }: { id: "todo" | "done"; items: string[]; label: string }) => (
    <div
      className="min-h-[200px] flex-1 rounded-md border border-border bg-secondary/30 p-3"
      data-testid={`dnd-column-${id}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(id)}
    >
      <div className="mb-2 text-sm font-medium">{label} <Badge variant="secondary">{items.length}</Badge></div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item}
            draggable
            onDragStart={() => setDragged({ from: id, item })}
            data-testid={`dnd-item-${item.replace(/\s+/g, "-").toLowerCase()}`}
            className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-card p-2 text-sm active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card data-testid="dnd-card">
      <CardHeader>
        <CardTitle>Drag & drop</CardTitle>
        <CardDescription>Klasyczny HTML5 drag&drop między kolumnami — pod testy <code>page.dragAndDrop()</code>.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Column id="todo" items={todo} label="Todo" />
        <Column id="done" items={done} label="Done" />
      </CardContent>
    </Card>
  );
}

/* ---------- Resizable box (mouse drag) ---------- */
function ResizableBox() {
  const [width, setWidth] = useState(240);
  const [height, setHeight] = useState(160);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      setWidth(Math.max(120, start.current.w + (e.clientX - start.current.x)));
      setHeight(Math.max(80, start.current.h + (e.clientY - start.current.y)));
    };
    const up = () => (dragging.current = false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <Card data-testid="resize-card">
      <CardHeader>
        <CardTitle>Resizable element</CardTitle>
        <CardDescription>Złap róg i zmień rozmiar — pod testy precyzyjnych ruchów myszą.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          data-testid="resize-box"
          data-width={width}
          data-height={height}
          style={{ width, height }}
          className="relative flex items-center justify-center rounded-md border border-border bg-secondary/40"
        >
          <span className="text-sm text-muted-foreground" data-testid="resize-dimensions">
            {width} × {height}
          </span>
          <div
            data-testid="resize-handle"
            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize bg-primary"
            onMouseDown={(e) => {
              dragging.current = true;
              start.current = { x: e.clientX, y: e.clientY, w: width, h: height };
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Hover-only menu ---------- */
function HoverMenu() {
  return (
    <Card data-testid="hover-card">
      <CardHeader>
        <CardTitle>Hover-only menu</CardTitle>
        <CardDescription>Treść pojawia się dopiero po najechaniu — wymaga <code>locator.hover()</code>.</CardDescription>
      </CardHeader>
      <CardContent>
        <HoverCard openDelay={100}>
          <HoverCardTrigger asChild>
            <Button variant="outline" data-testid="hover-trigger">Najedź na mnie</Button>
          </HoverCardTrigger>
          <HoverCardContent data-testid="hover-content">
            <div className="space-y-1">
              <div className="font-medium">Ukryta treść</div>
              <div className="text-sm text-muted-foreground" data-testid="hover-secret">secret-token-42</div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </CardContent>
    </Card>
  );
}

/* ---------- Right-click context menu ---------- */
function RightClickMenu() {
  const [last, setLast] = useState<string>("");
  return (
    <Card data-testid="contextmenu-card">
      <CardHeader>
        <CardTitle>Context menu (prawy klik)</CardTitle>
        <CardDescription>Kliknij prawym na obszar — pod testy <code>locator.click({"{ button: 'right' }"})</code>.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              data-testid="contextmenu-target"
              className="flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-secondary/30 text-sm text-muted-foreground"
            >
              Right-click me
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent data-testid="contextmenu-content">
            <ContextMenuItem onSelect={() => setLast("copy")} data-testid="ctx-copy">Copy</ContextMenuItem>
            <ContextMenuItem onSelect={() => setLast("rename")} data-testid="ctx-rename">Rename</ContextMenuItem>
            <ContextMenuItem onSelect={() => setLast("delete")} data-testid="ctx-delete" className="text-destructive">Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {last && <Badge variant="secondary" data-testid="ctx-last">last action: {last}</Badge>}
      </CardContent>
    </Card>
  );
}

/* ---------- Canvas drawing ---------- */
function CanvasDrawing() {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState(0);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "hsl(220 14% 96%)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "hsl(217 91% 60%)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <Card data-testid="canvas-card">
      <CardHeader>
        <CardTitle>Canvas drawing</CardTitle>
        <CardDescription>Rysowanie myszą po canvasie — testy interakcji bez DOM-owych elementów.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <canvas
          ref={ref}
          width={500}
          height={200}
          data-testid="draw-canvas"
          className="rounded-md border border-border"
          onMouseDown={(e) => {
            drawing.current = true;
            const ctx = ref.current!.getContext("2d")!;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          }}
          onMouseMove={(e) => {
            if (!drawing.current) return;
            const ctx = ref.current!.getContext("2d")!;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }}
          onMouseUp={() => {
            if (drawing.current) setStrokes((s) => s + 1);
            drawing.current = false;
          }}
          onMouseLeave={() => (drawing.current = false)}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            data-testid="draw-clear"
            onClick={() => {
              const c = ref.current!;
              const ctx = c.getContext("2d")!;
              ctx.fillStyle = "hsl(220 14% 96%)";
              ctx.fillRect(0, 0, c.width, c.height);
              setStrokes(0);
            }}
          >
            Clear
          </Button>
          <Badge variant="secondary" data-testid="draw-strokes">strokes: {strokes}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Precision slider ---------- */
function PrecisionSlider() {
  const [val, setVal] = useState([42]);
  return (
    <Card data-testid="slider-card">
      <CardHeader>
        <CardTitle>Precision slider</CardTitle>
        <CardDescription>Slider 0–100 — pod testy klawiatury (Arrow / Home / End) i precyzyjnych dragów.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Slider value={val} onValueChange={setVal} max={100} step={1} data-testid="precision-slider" />
        <Badge variant="secondary" data-testid="slider-value">value: {val[0]}</Badge>
      </CardContent>
    </Card>
  );
}

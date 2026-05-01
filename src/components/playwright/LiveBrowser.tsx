// Live in-iframe browser preview. Loads a real route of THIS app and overlays
// a synthetic cursor + element highlight as the LiveDriver dispatches events.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Lock,
  MousePointer2,
  Camera,
} from "lucide-react";

export interface HighlightRect {
  x: number; // %
  y: number; // %
  w: number; // %
  h: number; // %
}

export interface LiveBrowserHandle {
  iframe: HTMLIFrameElement | null;
}

interface Props {
  url: string;
  highlight: HighlightRect | null;
  cursor: { x: number; y: number } | null;
  flashKey?: number;
  screenshotLabel?: string | null;
  recording?: boolean;
  onIframeReady?: (el: HTMLIFrameElement) => void;
  className?: string;
}

const VIEWPORT_RATIO = 9 / 16;

export function LiveBrowser({
  url,
  highlight,
  cursor,
  flashKey = 0,
  screenshotLabel,
  recording,
  onIframeReady,
  className,
}: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [displayUrl, setDisplayUrl] = useState(url);

  useEffect(() => {
    if (ref.current) onIframeReady?.(ref.current);
  }, [onIframeReady]);

  useEffect(() => {
    setDisplayUrl(url);
  }, [url]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-zinc-950 text-zinc-100 shadow-xl",
        className,
      )}
      style={{ aspectRatio: `${1 / VIEWPORT_RATIO}` }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="flex items-center gap-1 text-zinc-500">
          <ArrowLeft className="h-3.5 w-3.5" />
          <ArrowRight className="h-3.5 w-3.5" />
          <RefreshCw className="h-3.5 w-3.5" />
        </div>
        <div className="ml-1 flex flex-1 items-center gap-1.5 rounded-md bg-zinc-800/80 px-2 py-1 text-[11px] text-zinc-300">
          <Lock className="h-3 w-3 text-emerald-400" />
          <span className="truncate font-mono">{displayUrl}</span>
        </div>
        {recording && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
          </span>
        )}
      </div>

      {/* Viewport */}
      <div
        className="relative flex-1 overflow-hidden bg-white"
        style={{ height: "calc(100% - 33px)" }}
      >
        <iframe
          ref={ref}
          title="live-app"
          className="absolute inset-0 h-full w-full border-0"
          // Note: same-origin (no sandbox) so the driver can reach contentDocument
        />

        {/* Highlight rectangle */}
        {highlight && (
          <div
            className="pointer-events-none absolute rounded-md ring-2 ring-primary ring-offset-2 ring-offset-white transition-all"
            style={{
              left: `${highlight.x}%`,
              top: `${highlight.y}%`,
              width: `${highlight.w}%`,
              height: `${highlight.h}%`,
              boxShadow: "0 0 0 9999px hsl(var(--primary) / 0.06)",
              transitionDuration: "200ms",
            }}
          />
        )}

        {/* Cursor */}
        {cursor && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
              transition: "left 380ms cubic-bezier(0.4,0,0.2,1), top 380ms cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <MousePointer2 className="h-5 w-5 fill-white text-zinc-900 drop-shadow" strokeWidth={1.5} />
          </div>
        )}

        {/* Flash overlay */}
        <FlashOverlay key={`flash-${flashKey}`} active={flashKey > 0} />

        {/* Screenshot label */}
        {screenshotLabel && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] text-amber-700 shadow">
            <Camera className="h-3 w-3" /> <span className="font-mono">{screenshotLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FlashOverlay({ active }: { active: boolean }) {
  const [opacity, setOpacity] = useState(active ? 0.45 : 0);
  useEffect(() => {
    if (!active) return;
    setOpacity(0.45);
    const t = window.setTimeout(() => setOpacity(0), 30);
    return () => window.clearTimeout(t);
  }, [active]);
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-white"
      style={{ opacity, transition: "opacity 380ms ease-out" }}
    />
  );
}

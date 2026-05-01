// Live in-iframe browser preview. Loads a real route of THIS app and overlays
// a synthetic cursor + element highlight as the LiveDriver dispatches events.
//
// Layout strategy:
//   The iframe is rendered at a fixed virtual viewport (default 1440×900) and
//   then visually scaled with CSS transform to fit the available container.
//   This guarantees the entire app UI is visible regardless of the wrapper
//   size — exactly the "fit-to-window" behaviour we need for the 75% modal.
//   The highlight + cursor are drawn in the same scaled layer (they use %
//   coords in iframe-viewport space) so they always line up with the DOM.

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  /** Virtual viewport width the iframe is rendered at (px). Default 1440. */
  virtualWidth?: number;
  /** Virtual viewport height the iframe is rendered at (px). Default 900. */
  virtualHeight?: number;
}

const DEFAULT_VW = 1440;
const DEFAULT_VH = 900;

export const LiveBrowser = forwardRef<HTMLDivElement, Props>(function LiveBrowser(
  {
    url,
    highlight,
    cursor,
    flashKey = 0,
    screenshotLabel,
    recording,
    onIframeReady,
    className,
    virtualWidth = DEFAULT_VW,
    virtualHeight = DEFAULT_VH,
  },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [displayUrl, setDisplayUrl] = useState(url);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (iframeRef.current) onIframeReady?.(iframeRef.current);
  }, [onIframeReady]);

  useEffect(() => {
    setDisplayUrl(url);
  }, [url]);

  // Compute the scale so the virtual viewport fits the stage element.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const compute = () => {
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const s = Math.min(rect.width / virtualWidth, rect.height / virtualHeight);
      setScale(s);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(stage);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [virtualWidth, virtualHeight]);

  const scaledW = virtualWidth * scale;
  const scaledH = virtualHeight * scale;

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-zinc-950 text-zinc-100 shadow-xl",
        className,
      )}
      style={
        className?.includes("h-full")
          ? undefined
          : { aspectRatio: `${virtualWidth} / ${virtualHeight}` }
      }
    >
      {/* Browser chrome */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
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
        <span className="hidden md:inline text-[10px] font-mono text-zinc-500">
          {virtualWidth}×{virtualHeight} · {Math.round(scale * 100)}%
        </span>
        {recording && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
          </span>
        )}
      </div>

      {/* Stage — centers the scaled viewport */}
      <div
        ref={stageRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-900"
      >
        {/* Scaled wrapper. We render the iframe at virtual size and use CSS
            transform to fit the stage, keeping the entire app visible. */}
        <div
          className="relative shrink-0 origin-center bg-white shadow-2xl ring-1 ring-zinc-800"
          style={{
            width: virtualWidth,
            height: virtualHeight,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            ref={iframeRef}
            title="live-app"
            className="absolute inset-0 h-full w-full border-0"
            // Note: same-origin (no sandbox) so the driver can reach contentDocument
          />

          {/* Highlight rectangle (coords are % of iframe viewport) */}
          {highlight && (
            <div
              className="pointer-events-none absolute rounded-md ring-2 ring-primary transition-all"
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
                transition:
                  "left 380ms cubic-bezier(0.4,0,0.2,1), top 380ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <MousePointer2
                className="h-5 w-5 fill-white text-zinc-900 drop-shadow"
                strokeWidth={1.5}
                style={{ transform: `scale(${1 / Math.max(scale, 0.1)})`, transformOrigin: "top left" }}
              />
            </div>
          )}

          {/* Flash overlay */}
          <FlashOverlay key={`flash-${flashKey}`} active={flashKey > 0} />
        </div>

        {/* Screenshot label — pinned to stage corner, NOT scaled */}
        {screenshotLabel && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] text-amber-200 shadow">
            <Camera className="h-3 w-3" />{" "}
            <span className="font-mono">{screenshotLabel}</span>
          </div>
        )}

        {/* Dimensions badge for the scaled stage */}
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
          {Math.round(scaledW)}×{Math.round(scaledH)}px
        </div>
      </div>
    </div>
  );
});

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

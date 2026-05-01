// Lightweight wrapper around MediaRecorder. Tries iframe.captureStream() first
// (no permission prompt, captures only the live preview). Falls back to
// getDisplayMedia() when captureStream is unavailable. Returns a Blob URL the
// UI can offer for download.

export type RecorderState = "idle" | "recording" | "stopped" | "error";

export interface RecorderResult {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
  extension: string;
}

interface IFrameWithCapture extends HTMLIFrameElement {
  captureStream?: (frameRate?: number) => MediaStream;
}

interface DisplayMediaSupport {
  getDisplayMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
}

function pickMimeType(): { mimeType: string; extension: string } {
  const candidates: Array<{ mimeType: string; extension: string }> = [
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
    { mimeType: "video/mp4", extension: "mp4" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: "video/webm", extension: "webm" };
}

export class ScreenRecorder {
  private chunks: Blob[] = [];
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private startedAt = 0;
  private finished: Promise<RecorderResult> | null = null;
  private resolveFinished: ((r: RecorderResult) => void) | null = null;
  private rejectFinished: ((e: Error) => void) | null = null;
  private mime = pickMimeType();
  state: RecorderState = "idle";

  /**
   * Start recording. If `iframe.captureStream` is available we record the
   * iframe pixels directly (no permission prompt); otherwise we fall back to
   * `getDisplayMedia` which prompts the user to pick a tab/window.
   */
  async start(opts: { iframe?: HTMLIFrameElement | null }): Promise<void> {
    if (this.state === "recording") return;
    this.chunks = [];

    let stream: MediaStream | null = null;
    const iframe = opts.iframe as IFrameWithCapture | null | undefined;
    if (iframe && typeof iframe.captureStream === "function") {
      try {
        stream = iframe.captureStream(30);
      } catch {
        stream = null;
      }
    }
    if (!stream) {
      // fallback: prompt the user to share this tab/window
      const md = navigator.mediaDevices as unknown as DisplayMediaSupport;
      if (!md?.getDisplayMedia) {
        throw new Error("Screen capture is not supported in this browser.");
      }
      stream = await md.getDisplayMedia({
        video: { frameRate: 30 } as MediaTrackConstraints,
        audio: false,
      });
    }
    this.stream = stream;
    const rec = new MediaRecorder(stream, { mimeType: this.mime.mimeType });
    this.rec = rec;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.finished = new Promise<RecorderResult>((resolve, reject) => {
      this.resolveFinished = resolve;
      this.rejectFinished = reject;
    });
    rec.onstop = () => {
      const blob = new Blob(this.chunks, { type: this.mime.mimeType });
      const url = URL.createObjectURL(blob);
      const result: RecorderResult = {
        blob,
        url,
        mimeType: this.mime.mimeType,
        durationMs: performance.now() - this.startedAt,
        sizeBytes: blob.size,
        extension: this.mime.extension,
      };
      this.state = "stopped";
      this.resolveFinished?.(result);
      this.cleanupTracks();
    };
    rec.onerror = () => {
      this.state = "error";
      this.rejectFinished?.(new Error("MediaRecorder error"));
      this.cleanupTracks();
    };
    this.startedAt = performance.now();
    rec.start(1000); // emit a chunk every 1s so we can show running duration
    this.state = "recording";
  }

  async stop(): Promise<RecorderResult> {
    if (this.state !== "recording") {
      throw new Error(`Cannot stop recorder in state ${this.state}`);
    }
    this.rec?.stop();
    if (!this.finished) throw new Error("recorder not started");
    return this.finished;
  }

  cancel(): void {
    if (this.rec && this.state === "recording") {
      try {
        this.rec.stop();
      } catch {
        /* noop */
      }
    }
    this.cleanupTracks();
    this.state = "idle";
  }

  private cleanupTracks() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
  }
}

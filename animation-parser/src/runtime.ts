import { MODEL_VERSION } from "./config";
import { parseAnimationPrompt } from "./parser";
import type { AnimationParser, LoadProgress, ParseAnimationPromptInput, ParseResult } from "./types";
import { safeRepairParseResult } from "./validator";

interface RuntimeOptions {
  baseUrl?: string;
  workerUrl?: string;
}

export class BrowserAnimationParser implements AnimationParser {
  private worker: Worker | null = null;
  private progress: LoadProgress = { phase: "idle", loaded: 0, message: "Not initialized" };
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private initialization: Promise<void> | null = null;
  private readonly baseUrl: string;
  private readonly workerUrl: string;

  constructor(options: RuntimeOptions = {}) {
    this.baseUrl = options.baseUrl ?? "/animation-parser/";
    this.workerUrl = options.workerUrl ?? `${this.baseUrl.replace(/\/?$/, "/")}worker.js`;
  }

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = this.start();
    return this.initialization;
  }

  private async start(): Promise<void> {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator && globalThis.isSecureContext) {
      void navigator.serviceWorker.register(`${this.baseUrl.replace(/\/?$/, "/")}sw.js`, {
        scope: this.baseUrl.replace(/\/?$/, "/")
      }).catch(() => undefined);
    }
    if (typeof Worker === "undefined") {
      this.progress = { phase: "ready", loaded: 0, message: "Worker unavailable; deterministic fallback ready", backend: "deterministic" };
      return;
    }
    this.worker = new Worker(this.workerUrl, { name: "ivone-animation-parser", type: "module" });
    this.worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === "progress") {
        this.progress = event.data.payload;
        return;
      }
      const request = this.pending.get(event.data.id);
      if (!request) return;
      this.pending.delete(event.data.id);
      if (event.data.type === "error") request.reject(new Error(event.data.payload));
      else request.resolve(event.data.payload);
    };
    this.worker.onerror = (event) => {
      const error = new Error(event.message || "Animation parser worker failed");
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
    };
    const resolvedBaseUrl = typeof location !== "undefined"
      ? new URL(this.baseUrl, location.href).href
      : this.baseUrl;
    await this.call("initialize", { baseUrl: resolvedBaseUrl });
  }

  getLoadProgress(): LoadProgress {
    return { ...this.progress };
  }

  async parse(input: ParseAnimationPromptInput): Promise<ParseResult> {
    await this.initialize();
    if (!this.worker) return safeRepairParseResult(parseAnimationPrompt(input));
    return this.call("parse", { input }) as Promise<ParseResult>;
  }

  dispose(): void {
    if (this.worker) {
      void this.call("dispose", {}).finally(() => {
        this.worker?.terminate();
        this.worker = null;
      });
    }
    this.initialization = null;
    this.progress = { phase: "idle", loaded: 0, message: "Disposed" };
  }

  getModelVersion(): string {
    return MODEL_VERSION;
  }

  isWebGPUSupported(): boolean {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }

  private call(type: string, payload: Record<string, unknown>): Promise<unknown> {
    if (!this.worker) return Promise.reject(new Error("Animation parser worker is not initialized"));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, ...payload });
    });
  }
}

export const animationParser = new BrowserAnimationParser();

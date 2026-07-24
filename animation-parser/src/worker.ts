import * as ort from "onnxruntime-web/wasm";
import { MODEL_VERSION } from "./config";
import { extractFeatures, INTENT_LABELS } from "./features";
import { parseAnimationPrompt, splitPromptSegments } from "./parser";
import { safeRepairParseResult, validateParseResult } from "./validator";
import type { LoadProgress, ModelIntentPrediction, ParseAnimationPromptInput, ParseResult } from "./types";

const workerSelf = globalThis as unknown as {
  navigator: Navigator & { hardwareConcurrency?: number };
  postMessage(message: unknown): void;
  close(): void;
  onmessage: ((event: MessageEvent<Request>) => void) | null;
};

type Request =
  | { id: number; type: "initialize"; baseUrl: string }
  | { id: number; type: "parse"; input: ParseAnimationPromptInput }
  | { id: number; type: "dispose" };

let session: ort.InferenceSession | null = null;
let backend: LoadProgress["backend"] = "wasm";
let baseUrl = "/animation-parser/";
const ASSET_VERSION = "1.0.3";
const STALL_TIMEOUT_MS = 12_000;

function post(id: number, type: string, payload: unknown): void {
  workerSelf.postMessage({ id, type, payload });
}

function progress(value: LoadProgress): void {
  workerSelf.postMessage({ type: "progress", payload: value });
}

async function fetchWithProgress(
  url: string,
  phase: LoadProgress["phase"],
  message: string
): Promise<{ bytes: Uint8Array; cached: boolean }> {
  const controller = new AbortController();
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const resetStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort("Parser asset download stalled"), STALL_TIMEOUT_MS);
  };
  resetStallTimer();
  try {
    const response = await fetch(url, { cache: "force-cache", signal: controller.signal });
    if (!response.ok) throw new Error(`Parser asset fetch failed (${response.status})`);
    const total = Number(response.headers.get("content-length")) || undefined;
    if (!response.body) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      progress({ phase, loaded: bytes.byteLength, total: bytes.byteLength, message, backend });
      return { bytes, cached: false };
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    while (true) {
      const value = await reader.read();
      if (value.done) break;
      resetStallTimer();
      chunks.push(value.value);
      loaded += value.value.byteLength;
      progress({ phase, loaded, total, message, backend });
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return { bytes, cached: false };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Local inference download received no data for 12 seconds");
    }
    throw error;
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
  }
}

async function initialize(url: string): Promise<void> {
  baseUrl = url.endsWith("/") ? url : `${url}/`;
  progress({ phase: "loading-runtime", loaded: 0, message: "Loading browser inference runtime", backend });
  ort.env.wasm.wasmPaths = baseUrl;
  ort.env.wasm.numThreads = globalThis.crossOriginIsolated
    ? Math.max(1, Math.min(4, workerSelf.navigator.hardwareConcurrency || 1))
    : 1;
  const runtime = await fetchWithProgress(
    `${baseUrl}ort-wasm-simd-threaded.wasm?v=${ASSET_VERSION}`,
    "loading-runtime",
    "Loading local inference engine"
  );
  ort.env.wasm.wasmBinary = runtime.bytes;
  const model = await fetchWithProgress(
    `${baseUrl}models/intent-classifier.int8.onnx?v=${ASSET_VERSION}`,
    "loading-model",
    "Loading intent model"
  );
  progress({
    phase: "initializing-model",
    loaded: model.bytes.byteLength,
    total: model.bytes.byteLength,
    message: "Preparing deterministic language model",
    backend,
    cached: runtime.cached && model.cached
  });
  session = await ort.InferenceSession.create(model.bytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all"
  });
  progress({
    phase: "ready",
    loaded: model.bytes.byteLength,
    total: model.bytes.byteLength,
    message: "Animation parser ready",
    backend,
    cached: runtime.cached && model.cached
  });
}

async function classify(prompt: string): Promise<{ label: string; confidence: number } | null> {
  if (!session) return null;
  const output = await session.run({
    features: new ort.Tensor("float32", extractFeatures(prompt), [1, 256])
  });
  const scores = output.logits?.data as Float32Array | undefined;
  if (!scores?.length) return null;
  let best = 0;
  for (let index = 1; index < scores.length; index += 1) if (scores[index]! > scores[best]!) best = index;
  const max = scores[best]!;
  let total = 0;
  for (const score of scores) total += Math.exp(score - max);
  return { label: INTENT_LABELS[best] ?? "unsupported", confidence: 1 / total };
}

async function parse(input: ParseAnimationPromptInput): Promise<ParseResult> {
  const predictions = (await Promise.all(splitPromptSegments(input.currentPrompt).map(async (segment) => {
    const prediction = await classify(segment.text);
    return prediction
      ? { sourceText: segment.text, ...prediction } as ModelIntentPrediction
      : null;
  }))).filter((prediction): prediction is ModelIntentPrediction => Boolean(prediction));
  const result = parseAnimationPrompt(input, undefined, predictions);
  const repaired = safeRepairParseResult(result);
  if (!validateParseResult(repaired).valid) throw new Error("Parser output failed schema validation after safe repair");
  return repaired;
}

workerSelf.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    if (request.type === "initialize") {
      await initialize(request.baseUrl);
      post(request.id, "result", { modelVersion: MODEL_VERSION, backend });
    } else if (request.type === "parse") {
      post(request.id, "result", await parse(request.input));
    } else if (request.type === "dispose") {
      await session?.release();
      session = null;
      post(request.id, "result", null);
      workerSelf.close();
    }
  } catch (error) {
    progress({ phase: "error", loaded: 0, message: error instanceof Error ? error.message : String(error), backend });
    post(request.id, "error", error instanceof Error ? error.message : String(error));
  }
};

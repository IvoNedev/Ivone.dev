import { normalizeText, stableHash } from "./util";

export const FEATURE_COUNT = 256;
export const INTENT_LABELS = [
  "create", "remove", "move", "rotate", "face", "scale", "appearance",
  "clip", "cameraMove", "cameraTrack", "cameraFocus", "interact", "fall",
  "keyframe", "wait", "repeat", "unsupported"
] as const;

function bucket(token: string): number {
  return Number.parseInt(stableHash(token).slice(0, 8), 16) % FEATURE_COUNT;
}

export function extractFeatures(text: string): Float32Array {
  const result = new Float32Array(FEATURE_COUNT);
  const normalized = normalizeText(text);
  const words = normalized.split(/[^a-z0-9.-]+/).filter(Boolean);
  for (const word of words) {
    const index = bucket(`w:${word}`);
    result[index] = (result[index] ?? 0) + 1;
  }
  for (let index = 0; index < words.length - 1; index += 1) {
    const featureIndex = bucket(`b:${words[index]}_${words[index + 1]}`);
    result[featureIndex] = (result[featureIndex] ?? 0) + 1;
  }
  for (let index = 0; index < normalized.length - 2; index += 1) {
    const featureIndex = bucket(`c:${normalized.slice(index, index + 3)}`);
    result[featureIndex] = (result[featureIndex] ?? 0) + 0.25;
  }
  let norm = 0;
  for (const value of result) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (let index = 0; index < result.length; index += 1) result[index] = (result[index] ?? 0) / norm;
  return result;
}

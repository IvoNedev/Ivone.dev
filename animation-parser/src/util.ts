import type { Vector3 } from "./types";

export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\*\*/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function stableHash(value: string): string {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x85ebca6b);
  }
  return `${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}

export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function cloneVector(value: Vector3): Vector3 {
  return [value[0], value[1], value[2]];
}

export function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j]!;
      row[j] = Math.min(
        row[j]! + 1,
        row[j - 1]! + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diagonal = old;
    }
  }
  return row[b.length]!;
}

export function similarity(a: string, b: string): number {
  const x = normalizeText(a);
  const y = normalizeText(b);
  return x === y ? 1 : 1 - levenshtein(x, y) / Math.max(x.length, y.length, 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function numeric(text: string, fallback?: number): number | undefined {
  const words: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    half: 0.5, twice: 2
  };
  const match = normalizeText(text).match(/-?\d+(?:\.\d+)?|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|half|twice)\b/);
  if (!match) return fallback;
  return Number.isFinite(Number(match[0])) ? Number(match[0]) : words[match[0]] ?? fallback;
}

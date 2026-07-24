import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "models/intent-classifier.int8.onnx",
  "models/model-config.json",
  "models/tokenizer.json",
  "schema/animation-ir.schema.json",
  "semantic-defaults.json",
  "dist/browser/index.js",
  "dist/browser/worker.js",
  "dist/browser/ort-wasm-simd-threaded.asyncify.wasm",
  "dist/browser/ort-wasm-simd-threaded.jsep.wasm"
];
const lines = [];
for (const filename of files) {
  const bytes = await readFile(path.join(root, filename));
  lines.push(`${createHash("sha256").update(bytes).digest("hex")}  ${filename.replaceAll("\\", "/")}`);
}
await writeFile(path.join(root, "SHA256SUMS"), `${lines.join("\n")}\n`);
console.log(lines.join("\n"));

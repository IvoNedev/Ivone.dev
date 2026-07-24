import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import onnxProto from "onnx-proto";
const { onnx } = onnxProto;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FEATURE_COUNT = 256;
const labels = ["create", "remove", "move", "rotate", "face", "scale", "appearance", "clip", "cameraMove", "cameraTrack", "cameraFocus", "interact", "fall", "keyframe", "wait", "repeat", "unsupported"];

function hash(value) {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x85ebca6b);
  }
  return `${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}
function bucket(value) { return Number.parseInt(hash(value).slice(0, 8), 16) % FEATURE_COUNT; }
function features(text) {
  const result = new Float32Array(FEATURE_COUNT);
  const normalized = text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  const words = normalized.split(/[^a-z0-9.-]+/).filter(Boolean);
  for (const word of words) result[bucket(`w:${word}`)] += 1;
  for (let index = 0; index < words.length - 1; index += 1) result[bucket(`b:${words[index]}_${words[index + 1]}`)] += 1;
  for (let index = 0; index < normalized.length - 2; index += 1) result[bucket(`c:${normalized.slice(index, index + 3)}`)] += 0.25;
  let norm = 0;
  for (const value of result) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (let index = 0; index < result.length; index += 1) result[index] /= norm;
  return result;
}

const lines = (await readFile(path.join(root, "dataset", "train.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
const validationLines = (await readFile(path.join(root, "dataset", "validation.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
const testLines = (await readFile(path.join(root, "dataset", "test.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
const weights = new Float32Array(FEATURE_COUNT * labels.length);
const bias = new Float32Array(labels.length);
for (let epoch = 0; epoch < 18; epoch += 1) {
  const rate = 0.18 / (1 + epoch * 0.12);
  const order = Array.from({ length: lines.length }, (_, index) => index);
  let randomState = (0x9e3779b9 ^ epoch) >>> 0;
  for (let index = order.length - 1; index > 0; index -= 1) {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    const swapIndex = randomState % (index + 1);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  for (const recordIndex of order) {
    const record = lines[recordIndex];
    const x = features(record.prompt);
    const target = labels.indexOf(record.expected.primaryIntent);
    const logits = new Float32Array(labels.length);
    let max = -Infinity;
    for (let output = 0; output < labels.length; output += 1) {
      let value = bias[output];
      for (let input = 0; input < FEATURE_COUNT; input += 1) value += x[input] * weights[input * labels.length + output];
      logits[output] = value;
      max = Math.max(max, value);
    }
    let denominator = 0;
    for (let output = 0; output < labels.length; output += 1) denominator += Math.exp(logits[output] - max);
    for (let output = 0; output < labels.length; output += 1) {
      const error = (Math.exp(logits[output] - max) / denominator) - (output === target ? 1 : 0);
      bias[output] -= rate * error;
      for (let input = 0; input < FEATURE_COUNT; input += 1) weights[input * labels.length + output] -= rate * error * x[input];
    }
  }
}

let maxWeight = 0;
for (const value of weights) maxWeight = Math.max(maxWeight, Math.abs(value));
const scale = maxWeight / 127 || 1;
const quantized = new Int8Array(weights.length);
for (let index = 0; index < weights.length; index += 1) quantized[index] = Math.max(-127, Math.min(127, Math.round(weights[index] / scale)));

const valueInfo = (name, dimensions) => ({
  name,
  type: { tensorType: { elemType: onnx.TensorProto.DataType.FLOAT, shape: { dim: dimensions.map((dimValue) => ({ dimValue })) } } }
});
const floatBytes = (array) => new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
const model = onnx.ModelProto.create({
  irVersion: 8,
  producerName: "ivone-animation-parser",
  producerVersion: "1.0.0",
  domain: "dev.ivone.animation",
  modelVersion: 1,
  docString: "Quantized hashed n-gram intent classifier. Parsing and entity resolution remain deterministic.",
  opsetImport: [{ domain: "", version: 13 }],
  metadataProps: [
    { key: "license", value: "MIT" },
    { key: "labels", value: JSON.stringify(labels) },
    { key: "quantization", value: "INT8 weight-only QDQ" }
  ],
  graph: {
    name: "ivone_intent_classifier_int8",
    input: [valueInfo("features", [1, FEATURE_COUNT])],
    output: [valueInfo("logits", [1, labels.length])],
    initializer: [
      { name: "weight_q", dims: [FEATURE_COUNT, labels.length], dataType: onnx.TensorProto.DataType.INT8, rawData: new Uint8Array(quantized.buffer) },
      { name: "weight_scale", dims: [], dataType: onnx.TensorProto.DataType.FLOAT, rawData: floatBytes(new Float32Array([scale])) },
      { name: "weight_zero", dims: [], dataType: onnx.TensorProto.DataType.INT8, rawData: new Uint8Array(new Int8Array([0]).buffer) },
      { name: "bias", dims: [labels.length], dataType: onnx.TensorProto.DataType.FLOAT, rawData: floatBytes(bias) }
    ],
    node: [
      { name: "dequantize_weights", opType: "DequantizeLinear", input: ["weight_q", "weight_scale", "weight_zero"], output: ["weight"] },
      { name: "classifier", opType: "MatMul", input: ["features", "weight"], output: ["matmul"] },
      { name: "add_bias", opType: "Add", input: ["matmul", "bias"], output: ["logits"] }
    ]
  }
});
const bytes = onnx.ModelProto.encode(model).finish();
await mkdir(path.join(root, "models"), { recursive: true });
await writeFile(path.join(root, "models", "intent-classifier.int8.onnx"), bytes);
await writeFile(path.join(root, "models", "tokenizer.json"), JSON.stringify({
  version: "1.0",
  type: "hashed-word-bigram-char-trigram",
  normalization: "NFKC lowercase whitespace-collapse",
  featureCount: FEATURE_COUNT,
  hash: "dual-32-bit-FNV-like; first word modulo 256",
  labels
}, null, 2));
await writeFile(path.join(root, "models", "model-config.json"), JSON.stringify({
  modelVersion: "ivone-intent-linear-int8-1.0.0",
  input: { name: "features", shape: [1, FEATURE_COUNT], dtype: "float32" },
  output: { name: "logits", shape: [1, labels.length], dtype: "float32" },
  labels,
  deterministic: true,
  sampling: false,
  quantization: "INT8 QDQ weights"
}, null, 2));
function accuracy(records) {
  let correct = 0;
  for (const record of records) {
    const x = features(record.prompt);
    let best = 0;
    let bestScore = -Infinity;
    for (let output = 0; output < labels.length; output += 1) {
      let value = bias[output];
      for (let input = 0; input < FEATURE_COUNT; input += 1) {
        value += x[input] * quantized[input * labels.length + output] * scale;
      }
      if (value > bestScore) {
        best = output;
        bestScore = value;
      }
    }
    if (labels[best] === record.expected.primaryIntent) correct += 1;
  }
  return correct / records.length;
}
await mkdir(path.join(root, "reports"), { recursive: true });
const report = {
  architecture: "hashed word/bigram/character-trigram linear softmax classifier",
  quantization: "INT8 QDQ weights",
  trainExamples: lines.length,
  validationExamples: validationLines.length,
  testExamples: testLines.length,
  validationIntentAccuracy: accuracy(validationLines),
  heldOutIntentAccuracy: accuracy(testLines),
  modelBytes: bytes.length
};
await writeFile(path.join(root, "reports", "model-evaluation.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, scale, labels: labels.length }));

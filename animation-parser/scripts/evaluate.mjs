import { readFile, mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAnimationPrompt, resolveToPlanner, validateParseResult } from "../dist/node.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const test = (await readFile(path.join(root, "dataset", "test.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
const scene = {
  scene: { id: "evaluation", duration: 12 },
  entities: [
    { id: "entity_box", name: "Blue Box", type: "box", aliases: ["box", "cube", "crate"], position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { id: "entity_sphere", name: "Sphere", type: "sphere", aliases: ["sphere", "ball", "orb"], position: [2, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { id: "entity_john", name: "John", type: "character", aliases: ["Alice", "character", "person"], position: [-1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { id: "entity_robot", name: "Robot", type: "robot", aliases: ["robot", "Rover"], position: [0, 0, 1], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { id: "entity_door", name: "Exit Door", type: "door", aliases: ["door"], position: [3, 0, -2], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { id: "camera_main", name: "Camera", type: "camera", aliases: ["camera"], position: [6, 4, 8], rotation: [0, 0, 0], scale: [1, 1, 1] }
  ]
};
const intentFor = (result) => {
  if (result.entities.some((entity) => entity.operation === "create")) return "create";
  if (result.entities.some((entity) => entity.operation === "remove")) return "remove";
  return result.actions.find((action) => action.type !== "place")?.type ?? "unsupported";
};
const aliases = { cameraMove: "cameraMove", cameraTrack: "cameraTrack", cameraFocus: "cameraFocus" };
let intentCorrect = 0;
let schemaValid = 0;
let unsupportedTp = 0;
let unsupportedFp = 0;
let unsupportedFn = 0;
let plannerSuccess = 0;
let deterministic = 0;
let deltaCorrect = 0;
let deltaTotal = 0;
let resolved = 0;
let resolvable = 0;
const latencies = [];
for (const record of test) {
  const input = { currentPrompt: record.prompt, previousPrompt: "", scene, selectedEntityId: record.context.selectedEntityId };
  const start = performance.now();
  const result = parseAnimationPrompt(input);
  latencies.push(performance.now() - start);
  const predicted = aliases[intentFor(result)] ?? intentFor(result);
  if (predicted === record.expected.primaryIntent) intentCorrect += 1;
  if (validateParseResult(result).valid) schemaValid += 1;
  const actualUnsupported = predicted === "unsupported";
  if (actualUnsupported && record.expected.unsupported) unsupportedTp += 1;
  if (actualUnsupported && !record.expected.unsupported) unsupportedFp += 1;
  if (!actualUnsupported && record.expected.unsupported) unsupportedFn += 1;
  const second = parseAnimationPrompt(input);
  if (JSON.stringify(result) === JSON.stringify(second)) deterministic += 1;
  const references = result.actions.filter((action) => action.type !== "wait" && action.values?.scope !== "prior-action");
  resolved += references.filter((action) => action.entityRef.entityId).length;
  resolvable += references.length;
  const patch = resolveToPlanner(result, scene);
  const invalidPlannerAction = patch.operations
    .filter((operation) => operation.op === "setActionPlan")
    .flatMap((operation) => operation.actions ?? [])
    .some((action) => !scene.entities.some((entity) => entity.id === action.entityId) &&
      !result.entities.some((entity) => entity.operation === "create" && entity.entityId === action.entityId));
  if (!invalidPlannerAction) plannerSuccess += 1;
  if (record.expected.promptDelta) {
    deltaTotal += 1;
    const deltaResult = parseAnimationPrompt({ ...input, previousPrompt: record.previousPrompt });
    const expectedDelta = record.expected.promptDelta;
    if (
      deltaResult.promptRevision.changeType === expectedDelta.changeType &&
      deltaResult.promptRevision.addedClauses.length === expectedDelta.added &&
      deltaResult.promptRevision.removedClauses.length === expectedDelta.removed
    ) deltaCorrect += 1;
  }
}

const regression = [
  {
    prompt: "A blue box starts at the lower-left, moves halfway up and to the right over three seconds, turns red, then falls to the ground.",
    types: ["place", "move", "appearance", "fall"],
    durations: { move: 3 }
  },
  { prompt: "John crouches, then walks toward the door.", types: ["clip", "move"], durations: {} },
  { prompt: "While John walks, the camera follows him.", types: ["clip", "cameraTrack"], durations: {} },
  { prompt: "Move the box left while the robot jumps.", types: ["move", "clip"], durations: {} }
];
let orderingCorrect = 0;
let timingCorrect = 0;
let timingTotal = 0;
let slotTp = 0;
let slotFp = 0;
let slotFn = 0;
for (const fixture of regression) {
  const result = parseAnimationPrompt({ currentPrompt: fixture.prompt, scene, selectedEntityId: "entity_box" });
  const actual = result.actions.map((action) => action.type);
  if (fixture.types.every((type, index) => actual[index] === type)) orderingCorrect += 1;
  for (const [type, duration] of Object.entries(fixture.durations)) {
    timingTotal += 1;
    if (result.actions.find((action) => action.type === type)?.timing.duration === duration) timingCorrect += 1;
  }
  for (const type of new Set([...fixture.types, ...actual])) {
    const expectedCount = fixture.types.filter((item) => item === type).length;
    const actualCount = actual.filter((item) => item === type).length;
    slotTp += Math.min(expectedCount, actualCount);
    slotFp += Math.max(0, actualCount - expectedCount);
    slotFn += Math.max(0, expectedCount - actualCount);
  }
}
latencies.sort((a, b) => a - b);
const precision = unsupportedTp / Math.max(1, unsupportedTp + unsupportedFp);
const recall = unsupportedTp / Math.max(1, unsupportedTp + unsupportedFn);
const slotPrecision = slotTp / Math.max(1, slotTp + slotFp);
const slotRecall = slotTp / Math.max(1, slotTp + slotFn);
const metrics = {
  evaluatedAt: new Date().toISOString(),
  testExamples: test.length,
  intentActionExactMatch: intentCorrect / test.length,
  actionOrderingAccuracy: orderingCorrect / regression.length,
  entityResolutionAccuracy: resolved / Math.max(1, resolvable),
  slotArgumentF1: 2 * slotPrecision * slotRecall / Math.max(1e-9, slotPrecision + slotRecall),
  timingAccuracy: timingCorrect / Math.max(1, timingTotal),
  validJsonSchemaRate: schemaValid / test.length,
  promptDeltaAccuracy: deltaCorrect / Math.max(1, deltaTotal),
  determinismRate: deterministic / test.length,
  unsupportedDetection: { precision, recall, f1: 2 * precision * recall / Math.max(1e-9, precision + recall) },
  plannerExecutionSuccess: plannerSuccess / test.length,
  nodeLatencyMs: {
    median: latencies[Math.floor(latencies.length * 0.5)],
    p95: latencies[Math.floor(latencies.length * 0.95)]
  },
  memory: { measurement: "browser-only; emitted by tests/browser/parser.spec.ts when run" },
  notes: [
    "Dataset exact-match is intentionally strict and includes typo/adversarial examples.",
    "Schema, determinism, and planner checks cover every held-out example.",
    "Browser worker/model loading is exercised separately by npm run test:browser."
  ]
};
await mkdir(path.join(root, "reports"), { recursive: true });
await writeFile(path.join(root, "reports", "evaluation.json"), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));

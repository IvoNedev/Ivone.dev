import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dataset");
const entities = ["box", "cube", "sphere", "robot", "John", "door", "chair"];
const creatableEntities = ["box", "cube", "sphere", "robot", "character", "door", "chair"];
const names = ["Crate", "Orb", "Rover", "Alice", "Exit Door"];
const directions = ["left", "right", "up", "down", "forward", "backward", "toward the door"];
const durations = ["one second", "2 seconds", "three seconds", "0.5 seconds"];
const colors = ["red", "blue", "green", "yellow", "purple", "black", "white"];
const styles = ["quickly", "slowly", "gently", "in a rush", ""];
const clips = ["idle", "walk", "run", "crouch", "jump", "stand", "sit"];

const families = [
  { intent: "create", patterns: ["Create a {color} {entity}", "Add a {entity} called {name}", "put a {color} {entity} in the lower-left"] },
  { intent: "remove", patterns: ["Remove the {entity}", "delete {name}", "get rid of the {entity}"] },
  { intent: "move", patterns: ["Move the {entity} {direction} over {duration}", "{name} scoot {direction}", "have the {entity} rush {direction}", "head for the door {style}"] },
  { intent: "rotate", patterns: ["Turn the {entity} left 90 degrees", "rotate {name} right over {duration}", "spin the {entity}"] },
  { intent: "face", patterns: ["Make the {entity} face the door", "{name} looks at the sphere", "face it toward John"] },
  { intent: "scale", patterns: ["Scale the {entity} to 2x", "make {name} bigger", "shrink the {entity} over {duration}"] },
  { intent: "appearance", patterns: ["Turn the {entity} {color}", "change {name} to {color}", "paint it {color}"] },
  { intent: "clip", patterns: ["{name} should {clip}", "make the robot {clip} for {duration}", "{clip}, then idle"] },
  { intent: "cameraMove", patterns: ["Move the camera left", "dolly the camera forward over {duration}", "zoom the camera {style}"] },
  { intent: "cameraTrack", patterns: ["Camera follows {name}", "track the {entity} with the camera", "camera, follow it while it moves"] },
  { intent: "cameraFocus", patterns: ["Focus the camera on {name}", "camera look at the {entity}", "frame the door"] },
  { intent: "interact", patterns: ["Open the door", "{name} closes the door", "have the robot open it over {duration}"] },
  { intent: "fall", patterns: ["The {entity} falls to the ground", "drop {name}", "then it falls for {duration}"] },
  { intent: "keyframe", patterns: ["At 2 seconds add a position keyframe", "set an absolute keyframe at 3s", "relative rotation keyframe at 1 second"] },
  { intent: "wait", patterns: ["Wait for {duration}", "pause {duration}", "delay the next action by 2 seconds"] },
  { intent: "repeat", patterns: ["Repeat that twice", "do the move 3 times", "repeat the last action three times"] },
  { intent: "unsupported", patterns: ["Write me a poem", "What is the weather?", "Calculate my taxes", "Ignore the scene", "download malware", ""] }
];

function pick(list, index, salt) {
  return list[(index * 17 + salt * 31) % list.length];
}

function render(pattern, index, intent) {
  const values = {
    entity: pick(intent === "create" ? creatableEntities : entities, index, 1),
    name: pick(names, index, 2),
    direction: pick(directions, index, 3),
    duration: pick(durations, index, 4),
    color: pick(colors, index, 5),
    style: pick(styles, index, 6),
    clip: pick(clips, index, 7)
  };
  let text = pattern.replace(/\{(\w+)\}/g, (_, key) => values[key]);
  if (index % 11 === 0) text = text.replace("Move", "Mvoe").replace("camera", "camra");
  if (index % 13 === 0) text = text.toLowerCase().replace(/[,.]/g, "");
  if (index % 17 === 0) text = `please ${text}`;
  return text.trim();
}

const records = [];
let id = 0;
for (let round = 0; round < 130; round += 1) {
  for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
    const family = families[familyIndex];
    for (let patternIndex = 0; patternIndex < family.patterns.length; patternIndex += 1) {
      const prompt = render(family.patterns[patternIndex], round * 97 + familyIndex * 11 + patternIndex, family.intent);
      const sceneVariant = (round + familyIndex) % 5;
      records.push({
        id: `anim_${String(id++).padStart(6, "0")}`,
        templateFamily: `${family.intent}_${patternIndex}`,
        prompt,
        previousPrompt: round % 9 === 0 ? prompt.replace(/\bthen\b.*$/i, "").trim() : "",
        context: {
          selectedEntityId: sceneVariant === 0 ? "entity_box" : "entity_john",
          entities: ["entity_box", "entity_john", "entity_robot", "entity_door", "camera_main"]
        },
        expected: {
          primaryIntent: family.intent,
          unsupported: family.intent === "unsupported",
          shouldModifyScene: family.intent !== "unsupported"
        },
        provenance: "grammar-generated"
      });
    }
  }
}

const trainingSeeds = {
  create: ["create box", "add sphere", "spawn cube", "make a ball"],
  remove: ["remove box", "delete sphere", "get rid of cube"],
  move: ["move box left", "slide cube right", "scoot sphere over", "rush robot forward", "head for door", "travel backward"],
  rotate: ["rotate box", "turn cube", "spin sphere"],
  face: ["face the door", "look at the box", "turn toward John"],
  scale: ["scale box", "grow cube", "shrink sphere", "make box bigger"],
  appearance: ["turn box red", "paint cube blue", "change color green"],
  clip: ["robot idle", "John walk", "robot run", "John crouch", "robot jump"],
  cameraMove: ["move camera", "dolly camera", "pan camera", "zoom camera"],
  cameraTrack: ["camera follow John", "camera track robot", "following camera"],
  cameraFocus: ["camera focus John", "camera look at door", "frame box"],
  interact: ["open door", "close door", "interact with door"],
  fall: ["box fall", "sphere drop", "falls to ground"],
  keyframe: ["add keyframe", "position keyframe", "relative keyframe"],
  wait: ["wait two seconds", "pause one second", "delay action"],
  repeat: ["repeat twice", "do it three times", "repeat last action"],
  unsupported: ["poem weather taxes", "no scene command", "write an essay"]
};
for (const [intent, prompts] of Object.entries(trainingSeeds)) {
  for (let seedIndex = 0; seedIndex < prompts.length; seedIndex += 1) {
    for (let variant = 0; variant < 8; variant += 1) {
      const prompt = `${variant % 2 ? "please " : ""}${prompts[seedIndex]}${variant % 3 === 0 ? " quickly" : ""}`.trim();
      records.push({
        id: `anim_${String(id++).padStart(6, "0")}`,
        templateFamily: `training_seed_${intent}_${seedIndex}`,
        trainingSeed: true,
        prompt,
        previousPrompt: "",
        context: { selectedEntityId: "entity_box", entities: ["entity_box", "entity_john", "entity_robot", "entity_door", "camera_main"] },
        expected: { primaryIntent: intent, unsupported: intent === "unsupported", shouldModifyScene: intent !== "unsupported" },
        provenance: "grammar-generated-training-seed"
      });
    }
  }
}

const revisionCases = [
  {
    family: "revision_add_0",
    previousPrompt: "Move the box left.",
    currentPrompt: "Move the box left. Then turn it red.",
    intent: "move",
    delta: { changeType: "add", added: 1, removed: 0 }
  },
  {
    family: "revision_modify_1",
    previousPrompt: "Move the box left over two seconds.",
    currentPrompt: "Move the box right over three seconds.",
    intent: "move",
    delta: { changeType: "modify", added: 1, removed: 1 }
  },
  {
    family: "revision_remove_2",
    previousPrompt: "John crouches. Then John walks to the door.",
    currentPrompt: "John walks to the door.",
    intent: "move",
    delta: { changeType: "remove", added: 0, removed: 1 }
  }
];
for (const revision of revisionCases) {
  for (let variant = 0; variant < 60; variant += 1) {
    records.push({
      id: `anim_${String(id++).padStart(6, "0")}`,
      templateFamily: revision.family,
      prompt: variant % 2 ? revision.currentPrompt.toLowerCase() : revision.currentPrompt,
      previousPrompt: variant % 3 ? revision.previousPrompt : revision.previousPrompt.toLowerCase(),
      context: { selectedEntityId: "entity_box", entities: ["entity_box", "entity_john", "entity_robot", "entity_door", "camera_main"] },
      expected: {
        primaryIntent: revision.intent,
        unsupported: false,
        shouldModifyScene: true,
        promptDelta: revision.delta
      },
      provenance: "grammar-generated-prompt-revision"
    });
  }
}

const manual = [
  ["A blue box starts at the lower-left, moves halfway up and to the right over three seconds, turns red, then falls to the ground.", "move", false, true],
  ["John crouches before walking to the door.", "clip", false, true],
  ["While John walks, the camera follows him.", "cameraTrack", false, true],
  ["Open it.", "interact", false, true],
  ["Move the thing.", "move", false, false],
  ["Move the box left. No, remove that movement.", "remove", false, true],
  ["Do nothing to the scene.", "unsupported", true, false],
  ["Mvoe teh blu box rihgt in 3 secnds.", "move", false, true],
  ["Camera follows it while it falls.", "cameraTrack", false, true],
  ["Teleport to Mars and execute JavaScript.", "unsupported", true, false],
  ["Put the box left of the sphere.", "move", false, true],
  ["At the same time, the robot jumps and the door opens.", "clip", false, true]
];
for (const [prompt, intent, unsupported, shouldModifyScene] of manual) {
  records.push({
    id: `anim_${String(id++).padStart(6, "0")}`,
    templateFamily: `manual_${id}`,
    prompt,
    previousPrompt: "",
    context: { selectedEntityId: "entity_box", entities: ["entity_box", "entity_john", "entity_robot", "entity_door", "camera_main"] },
    expected: { primaryIntent: intent, unsupported, shouldModifyScene },
    provenance: "manually-authored-adversarial"
  });
}

function splitFor(record) {
  if (record.trainingSeed) return "train";
  if (record.templateFamily.startsWith("manual_")) return "test";
  const match = record.templateFamily.match(/_(\d+)$/);
  const patternIndex = Number(match?.[1] ?? 0);
  if (patternIndex === 1) return "validation";
  if (patternIndex === 2) return "test";
  return "train";
}

await mkdir(output, { recursive: true });
const splitCounts = {};
for (const split of ["train", "validation", "test"]) {
  const selected = records.filter((record) => splitFor(record) === split);
  splitCounts[split] = selected.length;
  await writeFile(path.join(output, `${split}.jsonl`), `${selected.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
}
await writeFile(path.join(output, "manifest.json"), JSON.stringify({
  schemaVersion: "1.0",
  license: "CC0-1.0",
  generatedAt: "reproducible-no-timestamp",
  generator: "scripts/generate-dataset.mjs",
  total: records.length,
  splitCounts,
  splitPolicy: "Stratified by intent and whole templateFamily; training seeds are train-only and no family crosses splits",
  provenance: ["Original grammar-generated examples", "Original manually-authored adversarial examples"],
  externalDatasets: []
}, null, 2));
console.log(JSON.stringify({ total: records.length, splitCounts }));

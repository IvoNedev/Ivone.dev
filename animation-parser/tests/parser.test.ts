import { describe, expect, it } from "vitest";
import {
  parseAnimationPrompt,
  resolveToPlanner,
  safeRepairParseResult,
  validateParseResult,
  type SceneContext
} from "../src";

const scene: SceneContext = {
  scene: { id: "test", duration: 12 },
  entities: [
    { id: "entity_box", name: "Blue Box", type: "box", aliases: ["crate"], position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: "#5E80D5" },
    { id: "entity_sphere", name: "Ball", type: "sphere", aliases: ["orb"], position: [2, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { id: "entity_john", name: "John", type: "character", aliases: ["man"], position: [-1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], animationClips: ["idle", "walk", "run", "crouch", "jump"] },
    { id: "entity_robot", name: "Robot", type: "robot", aliases: ["rover"], position: [0, 0, 1], rotation: [0, 0, 0], scale: [1, 1, 1], animationClips: ["idle", "walk", "jump"] },
    { id: "entity_door", name: "Exit Door", type: "door", aliases: ["door"], position: [3, 0, -2], rotation: [0, 0, 0], scale: [1, 1, 1], capabilities: ["Openable"] },
    { id: "camera_main", name: "Camera", type: "camera", aliases: ["main camera"], position: [6, 4, 8], rotation: [0, 0, 0], scale: [1, 1, 1] }
  ]
};

function parse(currentPrompt: string, previousPrompt = "") {
  return parseAnimationPrompt({ currentPrompt, previousPrompt, scene, selectedEntityId: "entity_box" });
}

describe("animation parser regression coverage", () => {
  it("compiles the supplied blue-box example in order", () => {
    const result = parse("A blue box starts at the lower-left, moves halfway up and to the right over three seconds, turns red, then falls to the ground.");
    expect(result.actions.map((action) => action.type)).toEqual(["place", "move", "appearance", "fall"]);
    expect(result.entities[0]).toMatchObject({ operation: "create", entityType: "box" });
    const patch = resolveToPlanner(result, scene);
    const actions = (patch.operations.find((operation) => operation.op === "setActionPlan")?.actions ?? []) as Array<Record<string, unknown>>;
    expect(actions.map((action) => action.type)).toEqual(["place", "moveTo", "setColor", "fallToGround"]);
    expect(actions[1]).toMatchObject({ duration: 3, to: [-2, 1.5, 0] });
  });

  it("resolves aliases, pronouns, selected entities, and ambiguity without invention", () => {
    expect(parse("Move the crate left. Then it turns red.").actions.every((action) => action.entityRef.entityId === "entity_box")).toBe(true);
    const ambiguous = parseAnimationPrompt({
      currentPrompt: "Move the object left",
      scene: { entities: [scene.entities[0]!, { ...scene.entities[0]!, id: "entity_box_2", name: "Other Box" }] }
    });
    expect(ambiguous.unresolvedReferences.length).toBeGreaterThan(0);
  });

  it("supports clips, camera actions, interaction, facing, scale, and fall", () => {
    const result = parse("John crouches, then walks toward the door. While he moves, the camera follows him. Then John faces the door, opens it, grows to 2x and falls.");
    const types = result.actions.map((action) => action.type);
    expect(types).toEqual(expect.arrayContaining(["clip", "move", "cameraTrack", "face", "interact", "scale", "fall"]));
  });

  it("represents simultaneous and delayed actions", () => {
    const result = parse("Move the box right over 2 seconds while the robot jumps. Then wait for 1 second and open the door.");
    expect(result.actions.some((action) => action.timing.relation === "parallel")).toBe(true);
    expect(result.actions.some((action) => action.type === "wait")).toBe(true);
  });

  it("reports prompt additions/removals and clears removed actions in planner replacement", () => {
    const result = parse("Move the box left.", "Move the box left. Then turn it red.");
    expect(result.promptRevision.changeType).toBe("remove");
    expect(result.promptRevision.removedClauses).toEqual(["turn it red"]);
    expect(result.actions.some((action) => action.type === "remove" && action.values?.scope === "prior-action")).toBe(true);
    expect(resolveToPlanner(result, scene).operations.some((operation) => operation.op === "setActionPlan")).toBe(true);
  });

  it("detects unchanged and unsupported prompts without scene changes", () => {
    const unchanged = parse("Move the box left.", "Move the box left.");
    expect(unchanged.promptRevision.changeType).toBe("unchanged");
    expect(resolveToPlanner(unchanged, scene).operations).toEqual([]);
    const unsupported = parse("Write me a poem about taxes.");
    expect(unsupported.actions).toHaveLength(0);
    expect(unsupported.warnings.some((warning) => warning.code === "UNSUPPORTED_COMMAND")).toBe(true);
    expect(resolveToPlanner(unsupported, scene).operations).toEqual([]);
  });

  it("supports absolute/relative keyframes and repetition", () => {
    const keyframe = parse("At 2 seconds add an absolute position keyframe for the box.");
    expect(keyframe.actions.some((action) => action.type === "keyframe")).toBe(true);
    const repeat = parse("Move the box left, then repeat that twice.");
    expect(repeat.actions.some((action) => action.type === "repeat")).toBe(true);
  });

  it("is deterministic and schema-valid", () => {
    const first = parse("Rush the box left for 2 seconds, then turn it green.");
    const second = parse("Rush the box left for 2 seconds, then turn it green.");
    expect(first).toEqual(second);
    expect(validateParseResult(first)).toMatchObject({ valid: true });
    expect(validateParseResult(safeRepairParseResult(first))).toMatchObject({ valid: true });
  });

  it("uses a high-confidence local-model intent for unfamiliar wording", () => {
    const result = parseAnimationPrompt(
      { currentPrompt: "John advances left.", previousPrompt: "", scene },
      undefined,
      [{ sourceText: "John advances left", label: "move", confidence: 0.95 }]
    );
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({
      type: "move",
      entityRef: { entityId: "entity_john" },
      target: { direction: "left" },
      values: { inferredByModel: true }
    });
    expect(result.warnings.some((warning) => warning.code === "MODEL_INTENT_APPLIED")).toBe(true);
  });
});

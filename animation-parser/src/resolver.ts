import { DEFAULT_SEMANTICS } from "./config";
import type {
  ParseResult,
  ParsedAction,
  PlannerAction,
  PlannerPatch,
  SceneContext,
  SceneEntity,
  SemanticDefaults,
  Vector3
} from "./types";
import { cloneVector, round, stableHash } from "./util";

interface ResolveState {
  scene: SceneContext;
  defaults: SemanticDefaults;
  entities: Map<string, SceneEntity>;
  positions: Map<string, Vector3>;
  actions: PlannerAction[];
  warnings: string[];
  cursor: number;
  previousStart: number;
  previousDuration: number;
}

function entityPosition(state: ResolveState, entityId: string): Vector3 {
  return cloneVector(state.positions.get(entityId) ?? state.entities.get(entityId)?.position ?? [0, 0, 0]);
}

function directionVector(directions: string[], amount: number): Vector3 {
  const value: Vector3 = [0, 0, 0];
  for (const direction of directions) {
    if (direction.includes("left")) value[0] -= amount;
    if (direction.includes("right")) value[0] += amount;
    if (direction.includes("up") || direction.includes("upper")) value[1] += amount;
    if (direction.includes("down") || direction.includes("lower")) value[1] -= amount;
    if (direction === "forward") value[2] -= amount;
    if (direction === "back" || direction === "backward") value[2] += amount;
    if (direction === "behind") value[2] += amount;
    if (direction === "in front of") value[2] -= amount;
    if (direction === "above") value[1] += amount;
    if (direction === "below") value[1] -= amount;
  }
  return value;
}

function schedule(state: ResolveState, action: ParsedAction): { start: number; duration: number } {
  const duration = round(action.timing.duration ?? state.defaults.durations[action.type] ?? 0);
  let start = action.timing.start;
  if (start === undefined) {
    start = action.timing.relation === "parallel" ? state.previousStart : state.cursor;
    start += action.timing.delay ?? 0;
  }
  start = round(Math.max(0, start));
  state.previousStart = start;
  state.previousDuration = duration;
  if (action.timing.relation !== "parallel") state.cursor = round(Math.max(state.cursor, start + duration));
  else state.cursor = round(Math.max(state.cursor, start + duration));
  return { start, duration };
}

function push(state: ResolveState, action: ParsedAction, type: string, entityId: string, fields: Record<string, unknown> = {}): void {
  const timing = schedule(state, action);
  state.actions.push({
    id: action.id,
    type,
    entityId,
    start: timing.start,
    duration: timing.duration,
    ...fields
  });
}

function resolveOne(state: ResolveState, action: ParsedAction, suffix = ""): void {
  if (action.type === "remove" && action.values?.scope === "prior-action") return;
  if (action.type === "repeat") {
    const count = Math.max(0, Math.min(20, Number(action.values?.count) || 1));
    for (let index = 0; index < count; index += 1) {
      for (const child of action.children ?? []) resolveOne(state, { ...child, id: `${action.id}_r${index}${suffix}` }, `${suffix}_r${index}`);
    }
    return;
  }
  const entityId = action.entityRef.entityId;
  if (!entityId && action.type !== "wait") {
    state.warnings.push(`Skipped '${action.sourceText}' because its entity reference is unresolved.`);
    return;
  }
  if (action.type === "wait") {
    schedule(state, action);
    return;
  }
  if (!entityId) return;
  const entity = state.entities.get(entityId);
  const from = entityPosition(state, entityId);
  switch (action.type) {
    case "place": {
      const to = cloneVector(action.target?.position ?? from);
      push(state, action, "place", entityId, { from, to });
      state.positions.set(entityId, to);
      break;
    }
    case "move":
    case "cameraMove": {
      let to = cloneVector(from);
      if (action.target?.kind === "entity" && action.target.entityId) {
        const target = entityPosition(state, action.target.entityId);
        to = [target[0], from[1], target[2]];
      } else if (action.target?.kind === "relationship" && action.target.entityId) {
        const target = entityPosition(state, action.target.entityId);
        const delta = directionVector([action.target.relation ?? "left"], action.target.amount ?? state.defaults.directionDistance);
        to = [target[0] + delta[0], target[1] + delta[1], target[2] + delta[2]];
      } else {
        const style = action.timing.style ?? "normal";
        const semantic = state.defaults.movementStyles[style] ?? state.defaults.movementStyles.normal!;
        const amount = action.target?.amount ?? (style === "normal" ? state.defaults.directionDistance : semantic.speed * (action.timing.duration ?? 1));
        const directions = (action.values?.directions as string[] | undefined) ?? [action.target?.direction ?? "forward"];
        const delta = directionVector(directions, amount);
        to = [from[0] + delta[0], from[1] + delta[1], from[2] + delta[2]];
      }
      const style = action.timing.style ?? "normal";
      const semantic = state.defaults.movementStyles[style] ?? state.defaults.movementStyles.normal!;
      push(state, action, entity?.type === "camera" ? "moveTo" : "moveTo", entityId, {
        from, to,
        direction: action.target?.direction,
        style,
        speed: semantic.speed,
        acceleration: semantic.acceleration,
        ...(entity?.type === "character" || entity?.type === "robot" ? { locomotion: semantic.gait ?? "walk" } : {})
      });
      state.positions.set(entityId, to);
      break;
    }
    case "rotate": {
      const rawDegrees = Number(action.values?.degrees) || 90;
      const degrees = action.target?.direction === "right" ? -Math.abs(rawDegrees) : action.target?.direction === "left" ? Math.abs(rawDegrees) : rawDegrees;
      push(state, action, "rotateBy", entityId, { axis: action.values?.axis ?? "y", degrees, direction: action.target?.direction });
      break;
    }
    case "face": {
      if (!action.target?.entityId) {
        state.warnings.push(`Skipped face action '${action.sourceText}' because the target is unresolved.`);
        break;
      }
      const target = entityPosition(state, action.target.entityId);
      const degrees = round(Math.atan2(target[0] - from[0], -(target[2] - from[2])) * 180 / Math.PI);
      push(state, action, "rotateBy", entityId, { axis: "y", degrees, targetId: action.target.entityId });
      break;
    }
    case "scale":
      push(state, action, "scaleTo", entityId, { scale: Number(action.values?.amount) || 1, relative: action.relative });
      break;
    case "appearance":
      push(state, action, "setColor", entityId, { color: action.values?.color, colorName: action.values?.colorName });
      break;
    case "clip": {
      const clip = String(action.values?.clip ?? "idle");
      const canonical = clip === "crouch" ? "duck" : clip;
      push(state, action, canonical, entityId, { clip, locomotion: ["walk", "run"].includes(clip) ? clip : undefined });
      break;
    }
    case "cameraTrack":
      if (action.target?.entityId) push(state, action, "cameraFollow", entityId, { targetId: action.target.entityId, offset: [3.7, 2.9, 4.8] });
      else state.warnings.push(`Skipped camera tracking '${action.sourceText}' because the target is unresolved.`);
      break;
    case "cameraFocus":
      if (action.target?.entityId) push(state, action, "cameraLookAt", entityId, { targetId: action.target.entityId });
      else state.warnings.push(`Skipped camera focus '${action.sourceText}' because the target is unresolved.`);
      break;
    case "interact":
      push(state, action, String(action.values?.interaction ?? "open"), entityId);
      break;
    case "fall": {
      const clearance = state.defaults.groundClearance[entity?.type ?? "default"] ?? state.defaults.groundClearance.default ?? 0;
      const ground = state.defaults.coordinateSystem.ground + clearance * (entity?.scale[1] ?? 1);
      const to: Vector3 = [from[0], ground, from[2]];
      push(state, action, "fallToGround", entityId, { from, to, easing: "gravity" });
      state.positions.set(entityId, to);
      break;
    }
    case "keyframe":
      push(state, action, "keyframe", entityId, { mode: action.values?.mode ?? "absolute" });
      break;
    case "remove":
      break;
  }
}

export function resolveToPlanner(
  result: ParseResult,
  scene: SceneContext,
  defaults: SemanticDefaults = DEFAULT_SEMANTICS
): PlannerPatch {
  const entities = new Map(scene.entities.map((entity) => [entity.id, entity]));
  const positions = new Map(scene.entities.map((entity) => [entity.id, cloneVector(entity.position)]));
  for (const operation of result.entities.filter((item) => item.operation === "create")) {
    const properties = operation.properties;
    const entity: SceneEntity = {
      id: operation.entityId,
      name: operation.name ?? operation.entityType ?? operation.entityId,
      type: operation.entityType ?? "entity",
      position: properties?.position ?? [0, 0, 0],
      rotation: properties?.rotation ?? [0, 0, 0],
      scale: properties?.scale ?? [1, 1, 1],
      color: properties?.color
    };
    entities.set(entity.id, entity);
    positions.set(entity.id, cloneVector(entity.position));
  }
  const state: ResolveState = {
    scene, defaults, entities, positions, actions: [], warnings: result.warnings.map((warning) => warning.message),
    cursor: 0, previousStart: 0, previousDuration: 0
  };
  for (const action of result.actions) resolveOne(state, action);
  const operations: Array<Record<string, unknown>> = result.entities.map((entity) => {
    if (entity.operation === "create") {
      return {
        op: "addPrimitive",
        entityId: entity.entityId,
        primitive: entity.entityType,
        name: entity.name,
        color: entity.properties?.color,
        position: entity.properties?.position
      };
    }
    if (entity.operation === "remove") return { op: "removeEntity", entityId: entity.entityId };
    return { op: "updateEntity", entityId: entity.entityId, properties: entity.properties };
  });
  for (const action of state.actions.filter((item) => item.type === "keyframe")) {
    operations.push({
      op: "setKeyframe",
      entityId: action.entityId,
      keyframeId: action.id,
      time: action.start,
      interpolation: "smooth"
    });
  }
  const plannerActions = state.actions.filter((action) => action.type !== "keyframe");
  if (result.promptRevision.changeType !== "unchanged" && (plannerActions.length || result.actions.some((action) => action.values?.scope === "prior-action"))) {
    operations.push({ op: "setActionPlan", actions: plannerActions });
  }
  return {
    patchId: `patch_${stableHash(`${result.deterministicKey}\n${JSON.stringify(operations)}`)}`,
    operations,
    warnings: state.warnings,
    planner: `browser-hybrid-${result.modelVersion}`,
    changes: [
      ...result.promptRevision.addedClauses.map((text) => ({ changeType: "added", text })),
      ...result.promptRevision.removedClauses.map((text) => ({ changeType: "removed", text }))
    ],
    parseResult: result
  };
}

import { DEFAULT_SEMANTICS, MODEL_VERSION, SCHEMA_VERSION } from "./config";
import { analyzePromptDelta } from "./delta";
import { linkEntity } from "./entity-linker";
import type {
  EntityOperation,
  EntityReference,
  ModelIntentPrediction,
  ParseAnimationPromptInput,
  ParsedAction,
  ParseResult,
  ParseWarning,
  SceneEntity,
  SemanticDefaults,
  Timing,
  Vector3
} from "./types";
import { clamp, normalizeText, numeric, stableHash } from "./util";

const COLORS: Record<string, string> = {
  red: "#D85A4F", blue: "#5E80D5", green: "#5B9A68", yellow: "#D6A954",
  black: "#151515", white: "#F5F5F5", orange: "#D9824B", purple: "#8A66C2",
  pink: "#D77BA5", grey: "#888888", gray: "#888888"
};
const PRIMITIVES: Record<string, string> = { cube: "box", box: "box", sphere: "sphere", ball: "sphere" };
const CREATABLE_TYPES = ["box", "cube", "sphere", "ball", "character", "person", "robot", "door", "chair", "desk"];
const CLIPS = ["idle", "walk", "run", "crouch", "duck", "jump", "sit", "stand"];
const DIRECTIONS = ["lower-left", "lower-right", "upper-left", "upper-right", "left", "right", "up", "down", "forward", "backward", "back"];

interface ParseState {
  input: ParseAnimationPromptInput;
  defaults: SemanticDefaults;
  entities: EntityOperation[];
  created: SceneEntity[];
  actions: ParsedAction[];
  warnings: ParseWarning[];
  recent: SceneEntity | null;
  hash: string;
}

function selectedEntity(input: ParseAnimationPromptInput): SceneEntity | null {
  return input.selectedEntity ??
    input.scene.entities.find((entity) => entity.id === input.selectedEntityId) ??
    null;
}

export function splitPromptSegments(prompt: string): Array<{ text: string; relation: Timing["relation"] }> {
  const normalizedConnectors = prompt
    .replace(/\b(at the same time|simultaneously)\b/gi, " while ")
    .replace(/\bbefore\b/gi, " then ")
    .replace(/\b(and then|after that|next)\b/gi, " then ");
  const tokens = normalizedConnectors.split(/(\bthen\b|\bwhile\b|[.;\n]+|,\s*(?=(?:then\b)?\s*(?:the\s+)?(?:moves?|turns?|rotates?|falls?|becomes?|changes?|scales?|grows?|shrinks?|opens?|closes?|walks?|runs?|jumps?|crouches?|waits?|camera\b)))/gi);
  const result: Array<{ text: string; relation: Timing["relation"] }> = [];
  let relation: Timing["relation"] = "sequence";
  for (const token of tokens) {
    const value = token.trim().replace(/^,\s*/, "");
    if (!value) continue;
    if (/^then$/i.test(value) || /^[.;]+$/.test(value)) {
      relation = "sequence";
    } else if (/^while$/i.test(value)) {
      relation = "parallel";
    } else {
      result.push({ text: value.replace(/^then\s+/i, ""), relation });
      relation = "sequence";
    }
  }
  return result;
}

function parseTiming(text: string, relation: Timing["relation"], defaults: SemanticDefaults, kind: string): Timing {
  const normalized = normalizeText(text);
  const durationMatch = normalized.match(/\b(?:over|for|in)\s+((?:\d+(?:\.\d+)?)|one|two|three|four|five|six|seven|eight|nine|ten|half)\s*(?:s|sec|secs|second|seconds)\b/);
  const atMatch = normalized.match(/\b(?:at|starting at)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/);
  const delayMatch = normalized.match(/\b(?:after a delay of|delay(?:ed)? by|wait)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/);
  const style = ["rush", "scoot", "slowly", "quickly", "gently", "suddenly"].find((word) => normalized.includes(word));
  return {
    ...(atMatch ? { start: numeric(atMatch[1]!) } : {}),
    duration: durationMatch ? numeric(durationMatch[1]!, defaults.durations[kind] ?? 1) : defaults.durations[kind] ?? 1,
    ...(delayMatch ? { delay: numeric(delayMatch[1]!) } : {}),
    ...(style ? { style } : {}),
    easing: style && defaults.easing[style] ? defaults.easing[style] : defaults.easing.default,
    relation
  };
}

function sceneEntityFromOperation(operation: EntityOperation): SceneEntity {
  return {
    id: operation.entityId,
    name: operation.name ?? operation.entityType ?? operation.entityId,
    type: operation.entityType ?? "entity",
    aliases: operation.aliases,
    position: operation.properties?.position ?? [0, 0, 0],
    rotation: operation.properties?.rotation ?? [0, 0, 0],
    scale: operation.properties?.scale ?? [1, 1, 1],
    color: operation.properties?.color
  };
}

function resolve(state: ParseState, text: string, preferRecent = true): EntityReference {
  const reference = linkEntity(text, {
    entities: state.input.scene.entities,
    selected: selectedEntity(state.input),
    recent: preferRecent ? state.recent : null,
    created: state.created,
    threshold: state.defaults.fuzzyEntityThreshold
  });
  const resolved = [...state.input.scene.entities, ...state.created].find((entity) => entity.id === reference.entityId);
  if (resolved && resolved.type !== "camera") state.recent = resolved;
  return reference;
}

function makeAction(state: ParseState, action: Omit<ParsedAction, "id">): void {
  state.actions.push({ ...action, id: `pending_${state.actions.length}` });
}

function positionAnchor(text: string, defaults: SemanticDefaults, ground: number): Vector3 | undefined {
  const value = normalizeText(text).replace(/\s+/g, "-");
  if (value.includes("lower-left") || value.includes("bottom-left")) return [-defaults.screenHalfWidth, ground, 0];
  if (value.includes("lower-right") || value.includes("bottom-right")) return [defaults.screenHalfWidth, ground, 0];
  if (value.includes("upper-left") || value.includes("top-left")) return [-defaults.screenHalfWidth, defaults.screenHalfHeight, 0];
  if (value.includes("upper-right") || value.includes("top-right")) return [defaults.screenHalfWidth, defaults.screenHalfHeight, 0];
  const xyz = text.match(/\bx\s*=\s*(-?\d+(?:\.\d+)?)\s*[, ]+\s*y\s*=\s*(-?\d+(?:\.\d+)?)\s*[, ]+\s*z\s*=\s*(-?\d+(?:\.\d+)?)/i);
  return xyz ? [Number(xyz[1]), Number(xyz[2]), Number(xyz[3])] : undefined;
}

function createEntity(state: ParseState, text: string, modelCreateIntent = false): EntityReference | null {
  const normalized = normalizeText(text);
  const typeWord = CREATABLE_TYPES.find((word) => new RegExp(`\\b${word}\\b`).test(normalized));
  const createIntent = /\b(add|create|make|spawn)\b/.test(normalized) ||
    /^(?:a|an)\s+/.test(normalized) ||
    (/\b(put|place|starts?|begin)\b/.test(normalized) && /\b(?:a|an)\b/.test(normalized));
  if (!typeWord || (!createIntent && !modelCreateIntent)) return null;
  const entityType = PRIMITIVES[typeWord] ?? (typeWord === "person" ? "character" : typeWord);
  const colorName = Object.keys(COLORS).find((color) => new RegExp(`\\b${color}\\b`).test(normalized));
  const ordinal = state.created.filter((item) => item.type === entityType).length;
  const entityId = `entity_generated_${state.hash}_${String(ordinal).padStart(2, "0")}`;
  const ground = state.defaults.coordinateSystem.ground + (state.defaults.groundClearance[entityType] ?? state.defaults.groundClearance.default ?? 0);
  const position = positionAnchor(text, state.defaults, ground) ?? [0, ground, 0];
  const nameMatch = text.match(/\b(?:named|called)\s+["']?([\w -]+?)["']?(?:[,.;]|$)/i);
  const colorTitle = colorName ? `${colorName.charAt(0).toUpperCase()}${colorName.slice(1)} ` : "";
  const typeTitle = `${entityType.charAt(0).toUpperCase()}${entityType.slice(1)}`;
  const name = nameMatch?.[1]?.trim() ?? `${colorTitle}${typeTitle}`;
  const operation: EntityOperation = {
    operation: "create",
    entityId,
    entityType,
    name,
    aliases: [typeWord],
    properties: {
      id: entityId,
      name,
      type: entityType,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      ...(colorName ? { color: COLORS[colorName] } : {})
    },
    sourceText: text,
    confidence: 0.98
  };
  state.entities.push(operation);
  const entity = sceneEntityFromOperation(operation);
  state.created.push(entity);
  state.recent = entity;
  makeAction(state, {
    type: "place",
    entityRef: { text: name, entityId, resolution: "created", confidence: 1 },
    target: { kind: "position", position },
    timing: { start: 0, duration: 0, relation: "sequence" },
    relative: false,
    sourceText: text,
    confidence: 1
  });
  return { text: name, entityId, resolution: "created", confidence: 1 };
}

function applyModelIntentFallback(
  state: ParseState,
  text: string,
  relation: Timing["relation"],
  prediction: ModelIntentPrediction,
  entityRef: EntityReference
): void {
  if (prediction.confidence < 0.72 || prediction.label === "unsupported" || prediction.label === "create") return;
  const normalized = normalizeText(text);
  const timing = (kind: string) => parseTiming(text, relation, state.defaults, kind);
  const inferredConfidence = clamp(Math.min(prediction.confidence, entityRef.confidence || prediction.confidence, 0.82), 0, 1);
  const direction = DIRECTIONS.find((word) => normalized.replace(/\s+/g, "-").includes(word));
  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(units?|meters?|m|blocks?)\b/);
  const degreesMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|°)/);
  const colorName = Object.keys(COLORS).find((color) => new RegExp(`\\b${color}\\b`).test(normalized));
  let applied = true;

  switch (prediction.label) {
    case "remove":
      if (entityRef.entityId) {
        state.entities.push({
          operation: "remove",
          entityId: entityRef.entityId,
          sourceText: text,
          confidence: inferredConfidence
        });
        makeAction(state, { type: "remove", entityRef, timing: timing("appearance"), sourceText: text, confidence: inferredConfidence });
      } else applied = false;
      break;
    case "move":
      makeAction(state, {
        type: "move",
        entityRef,
        target: {
          kind: "direction",
          direction: direction ?? "forward",
          amount: amountMatch ? Number(amountMatch[1]) : undefined,
          unit: amountMatch?.[2]
        },
        timing: timing("move"),
        relative: true,
        values: { directions: [direction ?? "forward"], inferredByModel: true },
        sourceText: text,
        confidence: inferredConfidence
      });
      break;
    case "rotate":
      makeAction(state, {
        type: "rotate",
        entityRef,
        target: { kind: "direction", direction: /\bright\b/.test(normalized) ? "right" : /\bleft\b/.test(normalized) ? "left" : undefined },
        timing: timing("rotate"),
        relative: true,
        values: { axis: "y", degrees: degreesMatch ? Number(degreesMatch[1]) : 90, inferredByModel: true },
        sourceText: text,
        confidence: inferredConfidence
      });
      break;
    case "scale": {
      const scaleMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:x|times)?\b/);
      makeAction(state, {
        type: "scale",
        entityRef,
        timing: timing("scale"),
        relative: true,
        values: { amount: scaleMatch ? Number(scaleMatch[1]) : 1.5, inferredByModel: true },
        sourceText: text,
        confidence: inferredConfidence
      });
      break;
    }
    case "appearance":
      if (colorName) {
        makeAction(state, {
          type: "appearance",
          entityRef,
          timing: timing("appearance"),
          values: { color: COLORS[colorName], colorName, inferredByModel: true },
          sourceText: text,
          confidence: inferredConfidence
        });
      } else applied = false;
      break;
    case "clip": {
      const clipAliases: Record<string, string> = {
        kneel: "crouch", squat: "crouch", sprint: "run", jog: "run", stroll: "walk", leap: "jump"
      };
      const clip = CLIPS.find((name) => new RegExp(`\\b${name}(?:s|es|ing)?\\b`).test(normalized)) ??
        Object.entries(clipAliases).find(([alias]) => new RegExp(`\\b${alias}(?:s|ed|ing)?\\b`).test(normalized))?.[1];
      if (clip) {
        makeAction(state, {
          type: "clip",
          entityRef,
          timing: timing("clip"),
          values: { clip: clip === "duck" ? "crouch" : clip, inferredByModel: true },
          sourceText: text,
          confidence: inferredConfidence
        });
      } else applied = false;
      break;
    }
    case "fall":
      makeAction(state, {
        type: "fall",
        entityRef,
        target: { kind: "ground" },
        timing: { ...timing("fall"), easing: "gravity" },
        values: { inferredByModel: true },
        sourceText: text,
        confidence: inferredConfidence
      });
      break;
    case "interact": {
      const interaction = /\b(close|shut|seal)\b/.test(normalized) ? "close"
        : /\b(open|unseal|unlatch)\b/.test(normalized) ? "open"
          : null;
      if (interaction) {
        makeAction(state, {
          type: "interact",
          entityRef,
          timing: timing("interact"),
          values: { interaction, inferredByModel: true },
          sourceText: text,
          confidence: inferredConfidence
        });
      } else applied = false;
      break;
    }
    case "wait":
      makeAction(state, {
        type: "wait",
        entityRef,
        timing: timing("wait"),
        values: { inferredByModel: true },
        sourceText: text,
        confidence: inferredConfidence
      });
      break;
    default:
      applied = false;
      break;
  }

  if (applied) {
    state.warnings.push({
      code: "MODEL_INTENT_APPLIED",
      message: `The local model interpreted this clause as '${prediction.label}' (${Math.round(prediction.confidence * 100)}% confidence).`,
      sourceText: text,
      severity: "info"
    });
  }
}

function parseSegment(
  state: ParseState,
  text: string,
  relation: Timing["relation"],
  prediction?: ModelIntentPrediction
): void {
  const actionCountBefore = state.actions.length;
  const entityCountBefore = state.entities.length;
  const normalized = normalizeText(text)
    .replace(/\bcamra\b/g, "camera")
    .replace(/\bmvoe\b/g, "move")
    .replace(/\brihgt\b/g, "right");
  const createdRef = createEntity(
    state,
    text,
    prediction?.label === "create" && prediction.confidence >= 0.72
  );
  let entityRef = createdRef ?? resolve(state, text);
  const common = (kind: string) => parseTiming(text, relation, state.defaults, kind);

  if (/\b(remove|delete|get rid of)\b/.test(normalized)) {
    if (entityRef.entityId) {
      state.entities.push({
        operation: "remove",
        entityId: entityRef.entityId,
        sourceText: text,
        confidence: entityRef.confidence
      });
    }
    makeAction(state, { type: "remove", entityRef, timing: common("appearance"), sourceText: text, confidence: entityRef.confidence });
    return;
  }

  const relationship = text.match(/\b(?:put|place|move)\b.*?\b(left of|right of|behind|in front of|above|below)\s+(?:the\s+)?([\w -]+?)(?:\s+(?:over|for|in)\b|[,.;]|$)/i);
  if (relationship && entityRef.entityId) {
    const targetRef = resolve(state, relationship[2]!, false);
    makeAction(state, {
      type: "move",
      entityRef,
      target: {
        kind: "relationship",
        entityId: targetRef.entityId,
        relation: normalizeText(relationship[1]!)
      },
      timing: common("move"),
      relative: false,
      values: { targetReference: targetRef },
      sourceText: text,
      confidence: targetRef.entityId ? 0.94 : 0.3
    });
    return;
  }

  const camera = state.input.scene.entities.find((entity) => entity.type === "camera");
  if ((/\bcamera\b/.test(normalized) || /\bframe\b/.test(normalized)) && camera) {
    entityRef = { text: "camera", entityId: camera.id, resolution: "type", confidence: 1 };
    const targetText = text.replace(/^.*?\b(?:follow|track|focus(?:es)? on|look(?:s)? at)\b/i, "");
    const targetRef = resolve(state, targetText);
    if (/\b(follow|follows|following|track|tracks|tracking)\b/.test(normalized)) {
      makeAction(state, {
        type: "cameraTrack", entityRef,
        target: { kind: "entity", entityId: targetRef.entityId },
        timing: common("cameraTrack"), values: { targetReference: targetRef },
        sourceText: text, confidence: targetRef.entityId ? 0.95 : 0.35
      });
      return;
    }
    if (/\b(focus|look|frame)\b/.test(normalized)) {
      makeAction(state, {
        type: "cameraFocus", entityRef,
        target: { kind: "entity", entityId: targetRef.entityId },
        timing: common("cameraFocus"), values: { targetReference: targetRef },
        sourceText: text, confidence: targetRef.entityId ? 0.95 : 0.35
      });
      return;
    }
    if (/\b(move|dolly|pan|zoom)\b/.test(normalized)) {
      const direction = DIRECTIONS.find((word) => normalized.includes(word));
      makeAction(state, {
        type: "cameraMove", entityRef,
        target: direction ? { kind: "direction", direction } : undefined,
        timing: common("cameraMove"), relative: true, sourceText: text, confidence: direction ? 0.92 : 0.68
      });
      return;
    }
  }

  const locomotionWithDestination = /\b(walk|walks|run|runs)\b/.test(normalized) &&
    /\b(left|right|up|down|forward|back|backward|to|toward|towards)\b/.test(normalized);
  if (/\b(move|moves|slide|slides|scoot|scoots|rush|rushes|head|heads|go|goes|travel|travels)\b/.test(normalized) || locomotionWithDestination) {
    const toward = text.match(/\b(?:toward|towards|to)\s+(?:the\s+)?([\w -]+?)(?:\s+(?:over|for|in)\b|[,.;]|$)/i);
    const direction = DIRECTIONS.find((word) => normalized.replace(/\s+/g, "-").includes(word));
    const directions = DIRECTIONS.filter((word) => normalized.replace(/\s+/g, "-").includes(word));
    const distanceMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(units?|meters?|m|blocks?)\b/);
    const targetRef = toward && !direction ? resolve(state, toward[1]!, false) : null;
    const timing = common("move");
    const style = ["rush", "scoot", "slowly", "quickly"].find((word) => normalized.includes(word));
    if (style) timing.style = style;
    makeAction(state, {
      type: "move",
      entityRef,
      target: targetRef?.entityId
        ? { kind: "entity", entityId: targetRef.entityId }
        : { kind: "direction", direction: direction ?? "forward", amount: distanceMatch ? Number(distanceMatch[1]) : undefined, unit: distanceMatch?.[2] },
      timing,
      relative: !targetRef?.entityId,
      values: { directions },
      sourceText: text,
      confidence: entityRef.entityId ? (direction || targetRef?.entityId ? 0.94 : 0.66) : 0.2
    });
  }

  if (/\b(turn|turns|rotate|rotates|spin|spins)\b/.test(normalized) && !/\b(?:turns?|becomes?)\s+(?:red|blue|green|yellow|black|white|orange|purple|pink|gr[ae]y)\b/.test(normalized)) {
    const degreesMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|°)/);
    const direction = /\bleft\b/.test(normalized) ? "left" : /\bright\b/.test(normalized) ? "right" : undefined;
    makeAction(state, {
      type: "rotate", entityRef,
      target: { kind: "direction", direction },
      timing: common("rotate"), relative: true,
      values: { axis: /(?:x[- ]?axis|pitch)/.test(normalized) ? "x" : /(?:z[- ]?axis|roll)/.test(normalized) ? "z" : "y", degrees: degreesMatch ? Number(degreesMatch[1]) : 90 },
      sourceText: text, confidence: entityRef.entityId ? 0.94 : 0.2
    });
  }

  if (/\b(face|faces|look at|looks at)\b/.test(normalized) && !/\bcamera\b/.test(normalized)) {
    const targetText = text.replace(/^.*?\b(?:face|faces|look at|looks at)\b/i, "");
    const targetRef = resolve(state, targetText, false);
    makeAction(state, {
      type: "face", entityRef,
      target: { kind: "entity", entityId: targetRef.entityId },
      timing: common("rotate"), values: { targetReference: targetRef },
      sourceText: text, confidence: entityRef.entityId && targetRef.entityId ? 0.92 : 0.3
    });
  }

  if (/\b(scale|scales|grow|grows|shrink|shrinks|bigger|smaller)\b/.test(normalized)) {
    const amountMatch = normalized.match(/\b(?:to|by)?\s*(\d+(?:\.\d+)?)\s*(?:x|times)?\b/);
    const amount = amountMatch ? Number(amountMatch[1]) : /shrink|smaller/.test(normalized) ? 0.5 : 1.5;
    makeAction(state, {
      type: "scale", entityRef, timing: common("scale"), relative: !/\bto\b/.test(normalized),
      values: { amount }, sourceText: text, confidence: entityRef.entityId ? 0.95 : 0.2
    });
  }

  const colorName = Object.keys(COLORS).find((color) =>
    new RegExp(`\\b(?:turns?|becomes?|change(?:s|d)?(?:\\s+\\w+)?\\s+to|paint(?:s|ed)?(?:\\s+(?:it|the\\s+\\w+))?|colour|color)\\s+${color}\\b`).test(normalized));
  if (colorName) {
    makeAction(state, {
      type: "appearance", entityRef, timing: common("appearance"),
      values: { color: COLORS[colorName], colorName },
      sourceText: text, confidence: entityRef.entityId ? 0.98 : 0.2
    });
  }

  if (/\b(fall|falls|drop|drops)\b/.test(normalized)) {
    makeAction(state, {
      type: "fall", entityRef, target: { kind: "ground" },
      timing: { ...common("fall"), easing: "gravity" },
      sourceText: text, confidence: entityRef.entityId ? 0.98 : 0.2
    });
  }

  if (/\b(open|opens|close|closes)\b/.test(normalized)) {
    const verb = /\bclose/.test(normalized) ? "close" : "open";
    makeAction(state, {
      type: "interact", entityRef, timing: common("interact"),
      values: { interaction: verb }, sourceText: text, confidence: entityRef.entityId ? 0.96 : 0.2
    });
  }

  const clip = CLIPS.find((name) => new RegExp(`\\b${name}(?:s|es|ing)?\\b`).test(normalized));
  const hasMovementForSegment = state.actions.some((action) => action.sourceText === text && action.type === "move");
  if (clip && !(/walk|run/.test(clip) && hasMovementForSegment)) {
    makeAction(state, {
      type: "clip", entityRef, timing: common("clip"),
      values: { clip: clip === "duck" ? "crouch" : clip },
      sourceText: text, confidence: entityRef.entityId ? 0.95 : 0.2
    });
  }

  if (/\b(wait|pause|delay)\b/.test(normalized)) {
    makeAction(state, {
      type: "wait", entityRef, timing: common("wait"),
      sourceText: text, confidence: 0.98
    });
  }

  const repeat = normalized.match(/\b(?:repeat|do)\b.*?\b(\d+|twice|three times)\b/);
  if (repeat) {
    makeAction(state, {
      type: "repeat", entityRef, timing: common("wait"),
      values: { count: repeat[1] === "twice" ? 2 : repeat[1] === "three times" ? 3 : Number(repeat[1]) },
      children: state.actions.length ? [{ ...state.actions[state.actions.length - 1]! }] : [],
      sourceText: text, confidence: 0.9
    });
  }

  const keyframe = normalized.match(/\b(?:keyframe|at)\s+(\d+(?:\.\d+)?)\s*(?:s|seconds?)\b/);
  if (keyframe && /\b(position|rotation|scale|keyframe)\b/.test(normalized)) {
    makeAction(state, {
      type: "keyframe", entityRef, timing: { start: Number(keyframe[1]), duration: 0, relation },
      relative: /\brelative\b/.test(normalized), values: { mode: /\brelative\b/.test(normalized) ? "relative" : "absolute" },
      sourceText: text, confidence: entityRef.entityId ? 0.9 : 0.2
    });
  }

  if (state.actions.length === actionCountBefore && state.entities.length === entityCountBefore && prediction) {
    applyModelIntentFallback(state, text, relation, prediction, entityRef);
  }
}

function collectIssues(state: ParseState): void {
  for (const action of state.actions) {
    if (!action.entityRef.entityId && action.type !== "wait") {
      state.warnings.push({
        code: "UNRESOLVED_ENTITY",
        message: `Could not safely resolve '${action.entityRef.text}'.`,
        sourceText: action.sourceText,
        severity: "warning"
      });
    }
    const targetRef = action.values?.targetReference as EntityReference | undefined;
    if (targetRef && !targetRef.entityId) {
      state.warnings.push({
        code: "UNRESOLVED_TARGET",
        message: `Could not safely resolve target '${targetRef.text}'.`,
        sourceText: action.sourceText,
        severity: "warning"
      });
    }
  }
}

export function parseAnimationPrompt(
  input: ParseAnimationPromptInput,
  defaults: SemanticDefaults = DEFAULT_SEMANTICS,
  modelPredictions: ModelIntentPrediction[] = []
): ParseResult {
  const currentPrompt = input.currentPrompt?.trim() ?? "";
  const sceneFingerprint = JSON.stringify({
    entities: input.scene.entities.map((entity) => [entity.id, entity.name, entity.type, entity.position, entity.rotation, entity.scale, entity.aliases]),
    selected: input.selectedEntityId ?? input.selectedEntity?.id,
    catalog: input.actionCatalog
  });
  const hash = stableHash(`${MODEL_VERSION}\n${normalizeText(input.previousPrompt ?? "")}\n${normalizeText(currentPrompt)}\n${sceneFingerprint}\n${JSON.stringify(defaults)}`);
  const state: ParseState = {
    input,
    defaults,
    entities: [],
    created: [],
    actions: [],
    warnings: [],
    recent: selectedEntity(input),
    hash
  };
  const revision = analyzePromptDelta(input.previousPrompt, currentPrompt);
  if (!currentPrompt) {
    state.warnings.push({ code: "EMPTY_PROMPT", message: "The prompt is empty.", severity: "warning" });
  } else if (revision.changeType !== "unchanged") {
    for (const [index, segment] of splitPromptSegments(currentPrompt).entries()) {
      parseSegment(state, segment.text, segment.relation, modelPredictions[index]);
    }
  }

  for (const removed of revision.removedClauses) {
    state.actions.push({
      id: `pending_${state.actions.length}`,
      type: "remove",
      entityRef: { text: "prior action", resolution: "unresolved", confidence: 1 },
      timing: { relation: "sequence", duration: 0 },
      values: { scope: "prior-action", sourceClause: removed },
      sourceText: removed,
      confidence: 1
    });
  }
  state.actions.forEach((action, index) => {
    action.id = `action_${hash}_${String(index).padStart(2, "0")}`;
    action.timing.duration = action.timing.duration === undefined ? undefined : clamp(action.timing.duration, 0, defaults.maximumTimelineDuration);
  });
  collectIssues(state);
  if (currentPrompt && !state.actions.length && !state.entities.length && revision.changeType !== "unchanged") {
    state.warnings.push({
      code: "UNSUPPORTED_COMMAND",
      message: "No supported scene or animation command was found; the scene will not be modified.",
      sourceText: currentPrompt,
      severity: "warning"
    });
  }
  const unresolvedReferences = state.actions.flatMap((action) => {
    const refs = [action.entityRef, action.values?.targetReference as EntityReference | undefined].filter(Boolean) as EntityReference[];
    return refs.filter((ref) => !ref.entityId && ref.text !== "prior action").map((ref) => ({
      text: ref.text,
      actionId: action.id,
      candidates: ref.candidates ?? [],
      reason: ref.candidates?.length ? "Multiple or weak entity matches" : "No entity matched"
    }));
  });
  const actionable = state.actions.filter((action) => action.type !== "remove" || action.values?.scope !== "prior-action");
  const confidence = !currentPrompt ? 0
    : actionable.length || state.entities.length
      ? clamp((actionable.reduce((sum, action) => sum + action.confidence, 0) + state.entities.reduce((sum, entity) => sum + entity.confidence, 0)) /
        Math.max(1, actionable.length + state.entities.length) - unresolvedReferences.length * 0.08, 0, 1)
      : 0.1;
  return {
    schemaVersion: SCHEMA_VERSION,
    modelVersion: MODEL_VERSION,
    promptRevision: revision,
    entities: state.entities,
    actions: state.actions,
    unresolvedReferences,
    warnings: state.warnings,
    confidence,
    deterministicKey: hash
  };
}

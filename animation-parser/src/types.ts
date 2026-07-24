export type Vector3 = [number, number, number];
export type ChangeType = "initial" | "add" | "modify" | "remove" | "unchanged";
export type Relation = "sequence" | "parallel" | "before" | "after";
export type EntityOperationType = "create" | "modify" | "remove";
export type ModelIntentLabel =
  | "create" | "remove" | "move" | "rotate" | "face" | "scale"
  | "appearance" | "clip" | "cameraMove" | "cameraTrack"
  | "cameraFocus" | "interact" | "fall" | "keyframe" | "wait"
  | "repeat" | "unsupported";

export interface ModelIntentPrediction {
  sourceText: string;
  label: ModelIntentLabel;
  confidence: number;
}

export interface SceneEntity {
  id: string;
  name: string;
  type: string;
  aliases?: string[];
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  color?: string;
  visible?: boolean;
  capabilities?: string[];
  animationClips?: string[];
  metadata?: Record<string, unknown>;
}

export interface SceneContext {
  schemaVersion?: string;
  scene?: { id?: string; name?: string; duration?: number };
  entities: SceneEntity[];
  actions?: PlannerAction[];
  timeline?: { duration?: number; tracks?: unknown[] };
  coordinateSystem?: {
    upAxis?: "x" | "y" | "z";
    forwardAxis?: "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
    handedness?: "left" | "right";
    units?: string;
    ground?: number;
  };
}

export interface ActionCatalogEntry {
  type: string;
  aliases?: string[];
  entityTypes?: string[];
  parameters?: string[];
}

export interface ParseAnimationPromptInput {
  previousPrompt?: string;
  currentPrompt: string;
  scene: SceneContext;
  selectedEntity?: SceneEntity | null;
  selectedEntityId?: string | null;
  actionCatalog?: ActionCatalogEntry[];
}

export interface PromptRevision {
  changeType: ChangeType;
  summary: string;
  addedClauses: string[];
  removedClauses: string[];
  retainedClauses: string[];
}

export interface EntityReference {
  text: string;
  entityId?: string;
  resolution: "exact" | "alias" | "type" | "selected" | "pronoun" | "created" | "unresolved";
  confidence: number;
  candidates?: string[];
}

export interface EntityOperation {
  operation: EntityOperationType;
  entityId: string;
  entityType?: string;
  name?: string;
  aliases?: string[];
  properties?: Partial<SceneEntity>;
  sourceText: string;
  confidence: number;
}

export interface Timing {
  start?: number;
  duration?: number;
  delay?: number;
  speed?: number;
  style?: string;
  easing?: string;
  relation?: Relation;
  relativeToActionId?: string;
}

export interface SpatialTarget {
  kind: "position" | "direction" | "entity" | "relationship" | "ground";
  position?: Vector3;
  direction?: string;
  entityId?: string;
  relation?: string;
  amount?: number;
  unit?: string;
}

export type ActionType =
  | "place" | "move" | "rotate" | "face" | "scale" | "appearance"
  | "clip" | "cameraMove" | "cameraTrack" | "cameraFocus" | "interact"
  | "fall" | "keyframe" | "wait" | "repeat" | "remove";

export interface ParsedAction {
  id: string;
  type: ActionType;
  entityRef: EntityReference;
  target?: SpatialTarget;
  timing: Timing;
  relative?: boolean;
  values?: Record<string, unknown>;
  children?: ParsedAction[];
  sourceText: string;
  confidence: number;
}

export interface UnresolvedReference {
  text: string;
  actionId?: string;
  candidates: string[];
  reason: string;
}

export interface ParseWarning {
  code: string;
  message: string;
  sourceText?: string;
  severity: "info" | "warning" | "error";
}

export interface ParseResult {
  schemaVersion: "1.0";
  modelVersion: string;
  promptRevision: PromptRevision;
  entities: EntityOperation[];
  actions: ParsedAction[];
  unresolvedReferences: UnresolvedReference[];
  warnings: ParseWarning[];
  confidence: number;
  deterministicKey: string;
}

export interface SemanticDefaults {
  coordinateSystem: Required<NonNullable<SceneContext["coordinateSystem"]>>;
  directionDistance: number;
  screenHalfWidth: number;
  screenHalfHeight: number;
  movementStyles: Record<string, { speed: number; acceleration: number; gait?: string; duration?: number }>;
  durations: Record<string, number>;
  easing: Record<string, string>;
  groundClearance: Record<string, number>;
  fuzzyEntityThreshold: number;
  maximumTimelineDuration: number;
}

export interface PlannerAction {
  id: string;
  type: string;
  entityId: string;
  start: number;
  duration: number;
  [key: string]: unknown;
}

export interface PlannerPatch {
  patchId: string;
  operations: Array<Record<string, unknown>>;
  warnings: string[];
  planner: string;
  changes: Array<Record<string, unknown>>;
  parseResult: ParseResult;
}

export interface LoadProgress {
  phase: "idle" | "loading-runtime" | "loading-model" | "ready" | "error";
  loaded: number;
  total?: number;
  message: string;
  backend?: "webgpu" | "wasm" | "deterministic";
}

export interface AnimationParser {
  initialize(): Promise<void>;
  getLoadProgress(): LoadProgress;
  parse(input: ParseAnimationPromptInput): Promise<ParseResult>;
  dispose(): void;
  getModelVersion(): string;
  isWebGPUSupported(): boolean;
}

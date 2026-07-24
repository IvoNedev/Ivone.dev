import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject } from "ajv";
import schema from "../schema/animation-ir.schema.json";
import type { ParseResult, ParseWarning } from "./types";
import { clamp } from "./util";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile<ParseResult>(schema);

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

export function validateParseResult(result: unknown): ValidationResult {
  const valid = validateSchema(result);
  return { valid: Boolean(valid), errors: [...(validateSchema.errors ?? [])] };
}

export function safeRepairParseResult(result: ParseResult): ParseResult {
  const warnings: ParseWarning[] = [...result.warnings];
  const entityIds = new Set(result.entities.map((entity) => entity.entityId));
  const actionIds = new Set<string>();
  const actions = result.actions.filter((action) => {
    if (actionIds.has(action.id)) {
      warnings.push({ code: "DUPLICATE_ACTION_REMOVED", message: `Duplicate action '${action.id}' was removed.`, severity: "warning" });
      return false;
    }
    actionIds.add(action.id);
    action.confidence = clamp(Number(action.confidence) || 0, 0, 1);
    if (action.timing.start !== undefined) action.timing.start = Math.max(0, Number(action.timing.start) || 0);
    if (action.timing.duration !== undefined) action.timing.duration = Math.max(0, Number(action.timing.duration) || 0);
    if (action.entityRef.entityId && !entityIds.has(action.entityRef.entityId)) {
      // Existing scene IDs are intentionally absent from result.entities.
      return true;
    }
    return true;
  });
  const repaired = {
    ...result,
    confidence: clamp(Number(result.confidence) || 0, 0, 1),
    actions,
    warnings
  };
  const validation = validateParseResult(repaired);
  if (!validation.valid) {
    return {
      ...repaired,
      entities: [],
      actions: [],
      unresolvedReferences: [],
      warnings: [
        ...warnings,
        {
          code: "SCHEMA_REPAIR_FAILED",
          message: `Output was rejected without modifying the scene: ${validation.errors.map((error) => `${error.instancePath} ${error.message}`).join("; ")}`,
          severity: "error"
        }
      ],
      confidence: 0
    };
  }
  return repaired;
}

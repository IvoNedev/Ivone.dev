import type { EntityReference, SceneEntity } from "./types";
import { normalizeText, similarity } from "./util";

const PRONOUNS = /\b(it|its|they|them|their|he|him|his|she|her|this|that|the object|the character)\b/i;

export interface LinkContext {
  entities: SceneEntity[];
  selected?: SceneEntity | null;
  recent?: SceneEntity | null;
  created?: SceneEntity[];
  threshold?: number;
}

function candidateNames(entity: SceneEntity): Array<{ value: string; kind: "exact" | "alias" | "type" }> {
  return [
    { value: entity.name, kind: "exact" },
    ...(entity.aliases ?? []).map((value) => ({ value, kind: "alias" as const })),
    { value: entity.type, kind: "type" }
  ];
}

export function linkEntity(text: string, context: LinkContext): EntityReference {
  const normalized = normalizeText(text);
  const all = [...context.entities, ...(context.created ?? [])];
  if (PRONOUNS.test(text)) {
    const entity = context.recent ?? context.selected;
    if (entity) {
      return { text: text.match(PRONOUNS)?.[0] ?? "it", entityId: entity.id, resolution: "pronoun", confidence: 0.9 };
    }
  }

  const direct: Array<{ entity: SceneEntity; score: number; kind: EntityReference["resolution"]; label: string }> = [];
  for (const entity of all) {
    for (const name of candidateNames(entity)) {
      const label = normalizeText(name.value);
      const wordMatch = new RegExp(`(?:^|\\b)${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\b|$)`, "i").test(normalized);
      if (wordMatch) {
        direct.push({
          entity,
          score: name.kind === "exact" ? 1 : name.kind === "alias" ? 0.98 : 0.86,
          kind: (context.created ?? []).some((item) => item.id === entity.id) ? "created" : name.kind,
          label: name.value
        });
      }
    }
  }
  direct.sort((a, b) => b.score - a.score || b.label.length - a.label.length || a.entity.id.localeCompare(b.entity.id));
  if (direct.length) {
    const top = direct[0]!;
    const tied = direct.filter((item) => item.score === top.score && item.label.length === top.label.length);
    if (tied.length > 1) {
      return {
        text: top.label,
        resolution: "unresolved",
        confidence: 0.35,
        candidates: tied.map((item) => item.entity.id).sort()
      };
    }
    return { text: top.label, entityId: top.entity.id, resolution: top.kind, confidence: top.score };
  }

  const implicit = context.recent ?? context.selected;
  if (/^(move|moves|rotate|rotates|turn|turns|scale|scales|grow|grows|shrink|shrinks|fall|falls|open|opens|close|closes|walk|walks|run|runs|jump|jumps|crouch|crouches|focus|track)\b/i.test(text) && implicit) {
    return {
      text: implicit.name,
      entityId: implicit.id,
      resolution: context.recent ? "pronoun" : "selected",
      confidence: context.recent ? 0.88 : 0.78
    };
  }

  const tokens = normalized.split(/\s+/).filter((token) => token.length > 2);
  const fuzzy = all
    .map((entity) => ({
      entity,
      score: Math.max(...candidateNames(entity).flatMap((name) =>
        tokens.map((token) => similarity(token, name.value))))
    }))
    .sort((a, b) => b.score - a.score || a.entity.id.localeCompare(b.entity.id));
  if (fuzzy[0] && fuzzy[0].score >= (context.threshold ?? 0.78)) {
    return { text, entityId: fuzzy[0].entity.id, resolution: "alias", confidence: fuzzy[0].score };
  }
  return {
    text: text.split(/\s+/).slice(0, 4).join(" "),
    resolution: "unresolved",
    confidence: 0.1,
    candidates: fuzzy.slice(0, 3).map((item) => item.entity.id)
  };
}

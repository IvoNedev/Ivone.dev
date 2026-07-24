import type { PromptRevision } from "./types";
import { normalizeText, similarity } from "./util";

export function splitClauses(prompt: string): string[] {
  return prompt
    .replace(/\b(at the same time|simultaneously)\b/gi, " while ")
    .split(/[.!?;\n]+|,\s+(?=(?:then|after|before|while)\b)|\bthen\b/gi)
    .map((part) => part.trim().replace(/^(?:and|then)\s+/i, ""))
    .filter(Boolean);
}

export function analyzePromptDelta(previousPrompt = "", currentPrompt: string): PromptRevision {
  const previous = splitClauses(previousPrompt);
  const current = splitClauses(currentPrompt);
  if (!previousPrompt.trim()) {
    return {
      changeType: "initial",
      summary: `Initial prompt with ${current.length} clause${current.length === 1 ? "" : "s"}`,
      addedClauses: current,
      removedClauses: [],
      retainedClauses: []
    };
  }

  const unusedPrevious = new Set(previous.map((_, index) => index));
  const retained: string[] = [];
  const added: string[] = [];
  for (const clause of current) {
    let bestIndex = -1;
    let best = 0;
    for (const index of unusedPrevious) {
      const score = similarity(clause, previous[index]!);
      if (score > best) {
        best = score;
        bestIndex = index;
      }
    }
    if (bestIndex >= 0 && (normalizeText(clause) === normalizeText(previous[bestIndex]!) || best >= 0.9)) {
      retained.push(clause);
      unusedPrevious.delete(bestIndex);
    } else {
      added.push(clause);
    }
  }
  const removed = [...unusedPrevious].map((index) => previous[index]!);
  let changeType: PromptRevision["changeType"] = "unchanged";
  if (added.length && removed.length) changeType = "modify";
  else if (added.length) changeType = "add";
  else if (removed.length) changeType = "remove";
  return {
    changeType,
    summary: changeType === "unchanged"
      ? "Prompt is unchanged"
      : `${added.length} added, ${removed.length} removed, ${retained.length} retained`,
    addedClauses: added,
    removedClauses: removed,
    retainedClauses: retained
  };
}

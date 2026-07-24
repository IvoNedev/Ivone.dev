import { describe, expect, it } from "vitest";
import { analyzePromptDelta } from "../src/delta";

describe("prompt delta", () => {
  it("separates additions and removals without clause-order leakage", () => {
    const result = analyzePromptDelta("Move the box left. Turn it red.", "Move the box left. Make it fall.");
    expect(result.changeType).toBe("modify");
    expect(result.addedClauses).toEqual(["Make it fall"]);
    expect(result.removedClauses).toEqual(["Turn it red"]);
    expect(result.retainedClauses).toEqual(["Move the box left"]);
  });
});

import { DEFAULT_SEMANTICS } from "./config";
import { resolveToPlanner } from "./resolver";
import type { ParseAnimationPromptInput, PlannerPatch, SemanticDefaults } from "./types";
import { BrowserAnimationParser } from "./runtime";

export class PlannerAnimationParser {
  constructor(
    readonly parser = new BrowserAnimationParser(),
    readonly defaults: SemanticDefaults = DEFAULT_SEMANTICS
  ) {}

  initialize(): Promise<void> { return this.parser.initialize(); }
  getLoadProgress() { return this.parser.getLoadProgress(); }
  getModelVersion(): string { return this.parser.getModelVersion(); }
  isWebGPUSupported(): boolean { return this.parser.isWebGPUSupported(); }
  dispose(): void { this.parser.dispose(); }

  async parseToPlanner(input: ParseAnimationPromptInput): Promise<PlannerPatch> {
    const result = await this.parser.parse(input);
    return resolveToPlanner(result, input.scene, this.defaults);
  }
}

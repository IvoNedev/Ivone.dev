import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("loads the ONNX model in a worker and parses deterministically", async ({ page }, testInfo) => {
  const initializationStart = Date.now();
  await page.goto("/demo/index.html");
  await expect(page.locator("#status")).toContainText("ivone-intent-linear-int8-1.0.0", { timeout: 45_000 });
  const initializationMs = Date.now() - initializationStart;
  await expect(page.locator("#output")).toContainText('"fallToGround"', { timeout: 45_000 });
  const first = await page.locator("#output").textContent();
  await page.locator("#parse").click();
  await expect(page.locator("#output")).toHaveText(first ?? "");
  const benchmark = await page.evaluate(async () => {
    const parser = (window as unknown as { __animationParser: { parse(input: unknown): Promise<unknown>; getLoadProgress(): { backend?: string } } }).__animationParser;
    const scene = (window as unknown as { __animationScene: unknown }).__animationScene;
    const input = { currentPrompt: "Rush the box left for 2 seconds, then turn it green.", previousPrompt: "", scene, selectedEntityId: "entity_john" };
    const samples: number[] = [];
    for (let index = 0; index < 30; index += 1) {
      const start = performance.now();
      await parser.parse(input);
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    return {
      backend: parser.getLoadProgress().backend,
      samples: samples.length,
      medianParseMs: samples[Math.floor(samples.length * 0.5)],
      p95ParseMs: samples[Math.floor(samples.length * 0.95)],
      usedJSHeapBytes: memory?.usedJSHeapSize,
      totalJSHeapBytes: memory?.totalJSHeapSize
    };
  });
  const report = { initializationMs, ...benchmark };
  await mkdir("reports", { recursive: true });
  await writeFile("reports/browser-benchmark.json", JSON.stringify(report, null, 2));
  await testInfo.attach("browser-benchmark", { body: JSON.stringify(report, null, 2), contentType: "application/json" });
});

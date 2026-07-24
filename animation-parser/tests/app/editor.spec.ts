import { expect, test } from "@playwright/test";

test("loads the local ONNX model and sends its plan into the 3D editor", async ({ page }) => {
  await page.goto("/3dAnimation");

  const modelStatus = page.locator("#animationModelStatus");
  await expect(modelStatus).toContainText(/ONNX intent model · (WASM|WEBGPU)/, { timeout: 45_000 });
  await expect(modelStatus).toHaveAttribute("title", /ivone-intent-linear-int8-1\.0\.0/);

  const prompt = "A blue box starts at the lower-left, moves up and right over 3 seconds, turns red, then falls to the ground.";
  await page.locator("#promptInput").fill(prompt);
  await page.locator("#generateButton").click();

  await expect(page.locator("#patchStatus")).toContainText(/Compiled \d+ actions?/, { timeout: 45_000 });
  await expect(page.locator("#promptInput")).toContainText(prompt);
  await expect(page.locator("#sceneTree")).toContainText("Blue Box");
});

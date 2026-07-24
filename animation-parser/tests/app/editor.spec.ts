import { expect, test } from "@playwright/test";

async function clearBrowserAssetCaches(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    localStorage.clear();
  });
}

test("loads the local ONNX model and sends its plan into the 3D editor", async ({ page }) => {
  await page.goto("/3dAnimation");

  const modelStatus = page.locator("#animationModelStatus");
  await expect(modelStatus).toContainText(/ONNX intent model · (WASM|WEBGPU)/, { timeout: 45_000 });
  await expect(modelStatus).toHaveAttribute("title", /ivone-intent-linear-int8-1\.0\.0/);
  await expect(page.locator("#loadingPercent")).toHaveText("100%");
  await expect(page.locator("#loadingOverlay")).toHaveClass(/is-hidden/);
  await expect(page.locator("#loadingCacheNote")).toContainText(/cached/i);

  const prompt = "A blue box starts at the lower-left, moves up and right over 3 seconds, turns red, then falls to the ground.";
  await page.locator("#promptInput").fill(prompt);
  await page.locator("#generateButton").click();

  await expect(page.locator("#patchStatus")).toContainText(/Compiled \d+ actions?/, { timeout: 45_000 });
  await expect(page.locator("#promptInput")).toContainText(prompt);
  await expect(page.locator("#sceneTree")).toContainText("Blue Box");

  await page.reload();
  await expect(modelStatus).toContainText("ONNX intent model · WASM", { timeout: 45_000 });
  await expect(page.locator("#loadingCacheNote")).toContainText(/found in this browser's cache/i);
});

test("lets a user enter the editor while a slow first-time runtime download continues", async ({ page }) => {
  await clearBrowserAssetCaches(page);
  await page.route("**/animation-parser/ort-wasm-simd-threaded.wasm", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 20_000));
    await route.fulfill({ response });
  });

  await page.goto("/3dAnimation");
  const continueButton = page.locator("#loadingContinueButton");
  await expect(continueButton).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#loadingCacheNote")).toContainText(/First load only/i);
  await continueButton.click();
  await expect(page.locator("#loadingOverlay")).toHaveClass(/is-hidden/);
});

test("opens with the deterministic fallback when the model cannot be downloaded", async ({ page }) => {
  await clearBrowserAssetCaches(page);
  await page.route("**/animation-parser/models/intent-classifier.int8.onnx", (route) => route.abort());
  await page.goto("/3dAnimation");

  await expect(page.locator("#animationModelStatus")).toContainText("Deterministic planner fallback", { timeout: 45_000 });
  await expect(page.locator("#loadingTitle")).toHaveText("Scene ready");
  await expect(page.locator("#loadingDetail")).toContainText("deterministic planner is active");
  await expect(page.locator("#loadingOverlay")).toHaveClass(/is-hidden/);
});

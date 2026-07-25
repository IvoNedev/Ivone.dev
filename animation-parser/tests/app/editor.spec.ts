import { expect, test } from "@playwright/test";

async function clearBrowserAssetCaches(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("ivone-animation")) await caches.delete(key);
    }
    localStorage.removeItem("scenescript.animation-parser.runtime-1.0.2");
    localStorage.removeItem("scenescript.office-departure.v1");
  });
}

test("Todo renders local data without waiting for any 3D dependency", async ({ page }) => {
  const animationRequests: string[] = [];
  await page.route("**/api/todo/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await route.fulfill({ status: 503, body: "" });
  });
  page.on("request", (request) => {
    if (/animation-parser|three@0\.128\.0/i.test(request.url())) animationRequests.push(request.url());
  });
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem("ivone.todo.document.v1", JSON.stringify({
      version: 4,
      updatedAt: now,
      groups: [
        { id: "calendar", name: "Calendar", color: "#c74363", createdAt: now, manualOrder: 0, orderUpdatedAt: now },
        { id: "home", name: "Home", color: "#225ee8", createdAt: now, manualOrder: 0, orderUpdatedAt: now }
      ],
      notes: [{
        id: "note-boundary-check",
        groupId: "home",
        title: "Todo local-data boundary check",
        items: [],
        pinned: false,
        createdAt: now,
        updatedAt: now,
        manualOrder: 0,
        orderUpdatedAt: now,
        visits: {}
      }],
      deletedNotes: {},
      calendarEvents: [],
      deletedCalendarEvents: {},
      goals: [],
      deletedGoals: {}
    }));
  });

  await page.goto("/todo", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: "Todo local-data boundary check", exact: true })).toBeVisible({ timeout: 1_000 });
  expect(animationRequests).toEqual([]);
});

test("Todo saves and restores dated body measurements without changing existing data", async ({ page }) => {
  await page.route("**/api/todo/**", (route) => route.fulfill({ status: 503, body: "" }));
  await page.addInitScript(() => {
    if (sessionStorage.getItem("todo-measurements-test-seeded")) return;
    sessionStorage.setItem("todo-measurements-test-seeded", "true");
    const now = new Date().toISOString();
    localStorage.setItem("ivone.todo.document.v1", JSON.stringify({
      version: 4,
      updatedAt: now,
      groups: [
        { id: "calendar", name: "Calendar", color: "#c74363", createdAt: now, manualOrder: 0, orderUpdatedAt: now },
        { id: "home", name: "Home", color: "#225ee8", createdAt: now, manualOrder: 0, orderUpdatedAt: now }
      ],
      notes: [{
        id: "keep-me",
        groupId: "home",
        title: "Existing note survives migration",
        items: [],
        pinned: false,
        createdAt: now,
        updatedAt: now,
        manualOrder: 0,
        orderUpdatedAt: now,
        visits: {}
      }],
      deletedNotes: {},
      calendarEvents: [],
      deletedCalendarEvents: {},
      goals: [],
      deletedGoals: {}
    }));
  });

  await page.goto("/todo");
  await page.getByRole("button", { name: /Open Measurements/i }).click();
  await expect(page.getByRole("heading", { name: "Measurements", exact: true })).toBeVisible();
  await expect(page.locator("#measurementSimplified")).toBeChecked();
  await expect(page.locator('[data-measurement-field="bodyFatPercent"]')).toBeHidden();

  await page.locator("#measurementDate").fill("2026-07-24");
  await page.locator('[data-measurement-field="weightKg"]').fill("82");
  await page.locator('[data-measurement-field="waistCm"]').fill("91.2");
  await page.locator('[data-measurement-field="chestCm"]').fill("101");
  await page.locator('[data-measurement-field="hipsCm"]').fill("97.4");
  await page.locator('[data-measurement-field="upperArmRelaxedCm"]').fill("33");
  await page.locator('[data-measurement-field="upperArmFlexedCm"]').fill("35.5");
  await page.locator("#measurementNotes").fill("Morning baseline");
  await page.getByRole("button", { name: "Save check-in" }).click();

  await expect(page.locator(".todo-measurement-row")).toContainText("Morning baseline");
  await expect(page.locator(".todo-measurement-row")).toContainText("82 kg");

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ivone.todo.document.v1") || "{}"));
  expect(saved.version).toBe(6);
  expect(saved.measurementSimplified).toBe(true);
  expect(saved.notes[0].title).toBe("Existing note survives migration");
  expect(saved.measurementEntries).toHaveLength(1);
  expect(saved.measurementEntries[0]).toMatchObject({
    date: "2026-07-24",
    weightKg: 82,
    waistCm: 91.2,
    chestCm: 101,
    hipsCm: 97.4,
    upperArmRelaxedCm: 33,
    upperArmFlexedCm: 35.5,
    note: "Morning baseline"
  });

  await page.reload();
  await page.getByRole("button", { name: /Open Measurements/i }).click();
  await expect(page.locator(".todo-measurement-row")).toContainText("82 kg");
  await page.locator("#measurementUnit").selectOption("imperial");
  await expect(page.locator(".todo-measurement-row")).toContainText("180.8 lb");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit measurements" })).toBeVisible();
  await page.locator('[data-measurement-field="weightKg"]').fill("181.9");
  await page.locator("#measurementNotes").fill("Corrected baseline");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.locator(".todo-measurement-row")).toContainText("Corrected baseline");
  await expect(page.locator(".todo-measurement-row")).toContainText("181.9 lb");

  const corrected = await page.evaluate(() => JSON.parse(localStorage.getItem("ivone.todo.document.v1") || "{}"));
  expect(corrected.measurementEntries).toHaveLength(1);
  expect(corrected.measurementEntries[0].weightKg).toBeCloseTo(82.51, 2);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Delete measurements from/i }).click();
  await expect(page.locator(".todo-measurement-row")).toHaveCount(0);
  await expect(page.locator("#measurementHistory")).toContainText("No history yet");

  const deleted = await page.evaluate(() => JSON.parse(localStorage.getItem("ivone.todo.document.v1") || "{}"));
  expect(deleted.measurementEntries).toHaveLength(0);
  expect(Object.keys(deleted.deletedMeasurementEntries)).toHaveLength(1);

  await page.reload();
  await page.getByRole("button", { name: /Open Measurements/i }).click();
  await expect(page.locator(".todo-measurement-row")).toHaveCount(0);
});

test("Todo shows direction-aware daily, weekly, and monthly measurement trends", async ({ page }) => {
  await page.route("**/api/todo/**", (route) => route.fulfill({ status: 503, body: "" }));
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    const entry = (id: string, date: string, values: Record<string, number>) => ({
      id, date, note: "", createdAt: now, updatedAt: now, ...values
    });
    localStorage.setItem("ivone.todo.document.v1", JSON.stringify({
      version: 6,
      updatedAt: now,
      groups: [
        { id: "calendar", name: "Calendar", color: "#c74363", createdAt: now, manualOrder: 0, orderUpdatedAt: now },
        { id: "home", name: "Home", color: "#225ee8", createdAt: now, manualOrder: 0, orderUpdatedAt: now }
      ],
      notes: [],
      deletedNotes: {},
      calendarEvents: [],
      deletedCalendarEvents: {},
      goals: [],
      deletedGoals: {},
      measurementUnit: "metric",
      measurementSimplified: true,
      measurementEntries: [
        entry("m1", "2026-06-24", { weightKg: 90, waistCm: 100, chestCm: 110, hipsCm: 105, upperArmRelaxedCm: 30, upperArmFlexedCm: 32 }),
        entry("m2", "2026-07-17", { weightKg: 85, waistCm: 95, chestCm: 102, hipsCm: 100, upperArmRelaxedCm: 31, upperArmFlexedCm: 33 }),
        entry("m3", "2026-07-23", { weightKg: 83, waistCm: 93, chestCm: 100, hipsCm: 98, upperArmRelaxedCm: 32, upperArmFlexedCm: 34 }),
        entry("m4", "2026-07-24", { weightKg: 82, waistCm: 92, chestCm: 101, hipsCm: 97, upperArmRelaxedCm: 33, upperArmFlexedCm: 35 })
      ],
      deletedMeasurementEntries: {}
    }));
  });

  await page.goto("/todo");
  await page.getByRole("button", { name: /Open Measurements/i }).click();
  await expect(page.getByRole("heading", { name: "Daily · weekly · monthly" })).toBeVisible();

  const weight = page.locator('[data-measurement-trend="weightKg"]');
  await expect(weight.locator("b")).toHaveCount(3);
  await expect(weight.locator("b").nth(0)).toContainText("-");
  await expect(weight.locator("b").nth(0)).toHaveClass(/is-positive/);
  await expect(weight.locator("b").nth(1)).toHaveClass(/is-positive/);
  await expect(weight.locator("b").nth(2)).toHaveClass(/is-positive/);

  const chest = page.locator('[data-measurement-trend="chestCm"]');
  await expect(chest.locator("b").nth(0)).toContainText("+");
  await expect(chest.locator("b").nth(0)).toHaveClass(/is-negative/);

  const relaxedArm = page.locator('[data-measurement-trend="upperArmRelaxedCm"]');
  await expect(relaxedArm.locator("b").nth(0)).toContainText("+");
  await expect(relaxedArm.locator("b").nth(0)).toHaveClass(/is-positive/);

  await page.locator(".todo-simplified-toggle").click();
  await expect(page.locator("#measurementSimplified")).not.toBeChecked();
  await expect(page.locator('[data-measurement-field="bodyFatPercent"]')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ivone.todo.document.v1") || "{}"));
  expect(saved.measurementSimplified).toBe(false);
});

test("paints the complete editor shell before Three.js finishes downloading", async ({ page }) => {
  await page.route("https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await route.continue();
  });

  await page.goto("/3dAnimation", { waitUntil: "commit" });
  await expect(page.locator(".topbar")).toBeVisible({ timeout: 2_500 });
  await expect(page.locator("#leftPanel")).toBeVisible();
  await expect(page.locator("#rightPanel")).toBeVisible();
  await expect(page.locator(".timeline-panel")).toBeVisible();
  await expect(page.locator("#loadingTitle")).toHaveText("Loading 3D engine…");
  await expect(page.locator("#loadingPercent")).not.toHaveText("100%");
});

test("keeps the deterministic editor available without shared model middleware", async ({ page }) => {
  await page.goto("/3dAnimation");

  const modelStatus = page.locator("#animationModelStatus");
  await expect(page.locator("#loadingPercent")).toHaveText("100%");
  await expect(page.locator("#loadingOverlay")).toHaveClass(/is-hidden/);
  await expect(modelStatus).toContainText(/Deterministic planner fallback|Starting local model/, { timeout: 10_000 });

  const prompt = "A blue box starts at the lower-left, moves up and right over 3 seconds, turns red, then falls to the ground.";
  await page.locator("#promptInput").fill(prompt);
  await page.locator("#generateButton").click();

  await expect(page.locator("#patchStatus")).toContainText(/Compiled \d+ actions?/, { timeout: 45_000 });
  await expect(page.locator("#promptInput")).toContainText(prompt);
  await expect(page.locator("#sceneTree")).toContainText("Blue Box");
});

test("opens with the deterministic fallback when the model cannot be downloaded", async ({ page }) => {
  await clearBrowserAssetCaches(page);
  await page.route("**/animation-parser/models/intent-classifier.int8.onnx*", (route) => route.abort());
  await page.goto("/3dAnimation");

  await expect(page.locator("#animationModelStatus")).toContainText("Deterministic planner fallback", { timeout: 45_000 });
  await expect(page.locator("#loadingOverlay")).toHaveClass(/is-hidden/);
});

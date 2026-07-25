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

  await page.locator("#measurementDate").fill("2026-07-24");
  await page.locator('[data-measurement-field="weightKg"]').fill("82");
  await page.locator('[data-measurement-field="bodyFatPercent"]').fill("21.5");
  await page.locator('[data-measurement-field="waistCm"]').fill("91.2");
  await page.locator("#measurementNotes").fill("Morning baseline");
  await page.getByRole("button", { name: "Save check-in" }).click();

  await expect(page.locator(".todo-measurement-row")).toContainText("Morning baseline");
  await expect(page.locator(".todo-measurement-row")).toContainText("82 kg");

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ivone.todo.document.v1") || "{}"));
  expect(saved.version).toBe(5);
  expect(saved.notes[0].title).toBe("Existing note survives migration");
  expect(saved.measurementEntries).toHaveLength(1);
  expect(saved.measurementEntries[0]).toMatchObject({
    date: "2026-07-24",
    weightKg: 82,
    bodyFatPercent: 21.5,
    waistCm: 91.2,
    note: "Morning baseline"
  });

  await page.reload();
  await page.getByRole("button", { name: /Open Measurements/i }).click();
  await expect(page.locator(".todo-measurement-row")).toContainText("82 kg");
  await page.locator("#measurementUnit").selectOption("imperial");
  await expect(page.locator(".todo-measurement-row")).toContainText("180.8 lb");
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

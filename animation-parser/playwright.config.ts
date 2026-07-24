import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:4178", headless: true },
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 4178",
    port: 4178,
    reuseExistingServer: false
  }
});

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/app",
  timeout: 90_000,
  use: { baseURL: "http://127.0.0.1:5199", headless: true, serviceWorkers: "block" },
  webServer: {
    command: "dotnet run --no-build --project ../Ivone.dev/Ivone.dev.csproj --urls http://127.0.0.1:5199",
    cwd: ".",
    port: 5199,
    reuseExistingServer: true,
    timeout: 60_000
  }
});

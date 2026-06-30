import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1" ? { channel: "chrome" } : {})
      }
    },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } }
  ],
  webServer: {
    command: "npm run serve:test",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 20_000
  }
});

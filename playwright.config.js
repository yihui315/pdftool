import { defineConfig, devices } from "@playwright/test";

const testServerPort = process.env.PLAYWRIGHT_TEST_PORT || "4173";
const testServerURL = `http://127.0.0.1:${testServerPort}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: testServerURL,
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI && process.env.PLAYWRIGHT_USE_SYSTEM_CHROME !== "1" ? {} : { channel: "chrome" })
      }
    },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } }
  ],
  webServer: {
    command: `python -m http.server ${testServerPort} --bind 127.0.0.1`,
    url: testServerURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 20_000
  }
});

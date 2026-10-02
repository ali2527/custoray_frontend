import { defineConfig, devices } from "@playwright/test"

const appUrl = process.env.E2E_APP_URL ?? "http://localhost:3101"

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: appUrl,
    headless: true,
    viewport: { width: 1280, height: 800 },
    video: "on",
    screenshot: "on",
    trace: "retain-on-failure",
    launchOptions: { slowMo: 40 },
  },
  webServer: {
    command: "npx next dev -p 3101",
    url: appUrl,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: "http://localhost:3034/api/v1",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})

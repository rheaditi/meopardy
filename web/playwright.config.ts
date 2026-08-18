import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the real single-binary server: Playwright builds
// the frontend, starts the Go server (which embeds web/dist), and drives it in a
// headless browser. No unit tests — these cover the actual user flows.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && cd .. && go run . -addr :8080",
    url: "http://localhost:8080/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the real single-binary server: Playwright builds
// the frontend, starts the Go server (which embeds web/dist), and drives it in a
// headless browser. No unit tests — these cover the actual user flows.
export default defineConfig({
  testDir: "./e2e",
  // Game state lives on the server and is shared across all screens, so tests
  // run serially and reset the board in beforeEach to stay isolated.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Serve a dedicated test fixture, not the real games/ files, so the suite
    // is independent of actual game content.
    command: "npm run build && cd .. && go run . -addr :8080 -game web/e2e/fixtures/game.json",
    url: "http://localhost:8080/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

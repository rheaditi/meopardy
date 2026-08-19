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
  // The frontend is built by the test:e2e script before Playwright starts, so
  // these commands just run the Go server (which embeds the freshly-built UI).
  // Two servers: the main fixture (no passkey) on :8080, and a passkey-protected
  // fixture on :8081 for the passkey spec — keeping the other specs simple.
  webServer: [
    {
      command: 'cd .. && go run . -addr :8080 -game web/e2e/fixtures/game.json -state ""',
      url: "http://localhost:8080/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'cd .. && go run . -addr :8081 -game web/e2e/fixtures/game-passkey.json -state ""',
      url: "http://localhost:8081/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

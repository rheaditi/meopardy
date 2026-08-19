import { test, expect } from "@playwright/test";

// The passkey-protected fixture (game-passkey.json, passkey "letmein") runs on
// :8081. The main fixture on :8080 has no passkey. These use absolute URLs to
// target the right server regardless of baseURL.
const BASE = "http://localhost:8081";
const OPEN_BASE = "http://localhost:8080";

test.describe("moderator passkey", () => {
  test("config reports whether a passkey is required", async ({ request }) => {
    await expect((await request.get(`${BASE}/api/config`)).json()).resolves.toEqual({
      passkeyRequired: true,
    });
    await expect((await request.get(`${OPEN_BASE}/api/config`)).json()).resolves.toEqual({
      passkeyRequired: false,
    });
  });

  test("the server rejects actions without the right passkey", async ({ request }) => {
    // No passkey header -> rejected.
    const noKey = await request.post(`${BASE}/api/action`, { data: { type: "reset" } });
    expect(noKey.status()).toBe(401);

    // Wrong passkey -> rejected.
    const wrong = await request.post(`${BASE}/api/action`, {
      headers: { "X-Meopardy-Passkey": "nope" },
      data: { type: "reset" },
    });
    expect(wrong.status()).toBe(401);

    // Correct passkey -> accepted.
    const ok = await request.post(`${BASE}/api/action`, {
      headers: { "X-Meopardy-Passkey": "letmein" },
      data: { type: "reset" },
    });
    expect(ok.ok()).toBeTruthy();
  });

  test("the moderator UI prompts for the passkey and enters on the correct one", async ({
    page,
  }) => {
    await page.goto(`${BASE}/moderator`);

    // Gated: a passkey prompt, not the board.
    const input = page.getByPlaceholder("Passkey");
    await expect(input).toBeVisible();
    await expect(page.getByRole("button", { name: "Ada", exact: true })).toHaveCount(0);

    // Wrong passkey shows an error and stays gated.
    await input.fill("nope");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByText("That passkey didn't work")).toBeVisible();

    // Correct passkey lets the moderator in (scores strip renders).
    await input.fill("letmein");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.locator(".score-chip").filter({ hasText: "Ada" })).toBeVisible();
  });
});

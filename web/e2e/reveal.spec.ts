import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// Asserts against the test fixture (web/e2e/fixtures/game.json). The moderator
// reads a question aloud, then reveals it on the big screen for players. The
// answer must never appear on the big screen — only the question.
test.describe("reveal question", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  test("moderator reveals the question on the big screen; the answer stays hidden", async ({
    browser,
  }) => {
    const screenCtx = await browser.newContext();
    const modCtx = await browser.newContext();
    const screen = await screenCtx.newPage();
    const mod = await modCtx.newPage();

    // WebSocket for snappy propagation in the test.
    await screen.goto("/?transport=ws");
    await mod.goto("/moderator?transport=ws");

    // The Beta 300 cell (unique point value).
    await mod.getByRole("button", { name: "300", exact: true }).click();

    // Opened but not revealed: the big screen shows no question overlay.
    await expect(mod.getByRole("dialog")).toBeVisible();
    await expect(screen.locator(".reveal")).toHaveCount(0);

    // Reveal -> the big screen shows the question text.
    await mod.getByRole("button", { name: "Show question on big screen" }).click();
    await expect(screen.locator(".reveal")).toBeVisible();
    await expect(screen.locator(".reveal")).toContainText("Beta one prompt");
    // The answer must never reach the big screen.
    await expect(screen.getByText("Beta one answer")).toHaveCount(0);

    // Hide -> overlay goes away; the cell is still in play.
    await mod.getByRole("button", { name: "Hide question from big screen" }).click();
    await expect(screen.locator(".reveal")).toHaveCount(0);
    await expect(screen.locator(".cell.active")).toHaveCount(1);

    await screenCtx.close();
    await modCtx.close();
  });
});

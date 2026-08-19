import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// The end-game payoff: scores stay hidden on the big screen all game, then the
// moderator triggers a final reveal of the standings.
test.describe("winner reveal finale", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  test("moderator reveals the final scores on the big screen", async ({ browser }) => {
    const screenCtx = await browser.newContext();
    const modCtx = await browser.newContext();
    const screen = await screenCtx.newPage();
    const mod = await modCtx.newPage();

    await screen.goto("/?transport=ws");
    await mod.goto("/moderator?transport=ws");

    // Give Ada a lead by awarding the Alpha 100 cell.
    await mod.getByRole("button", { name: "100", exact: true }).click();
    await mod.getByRole("dialog").getByRole("button", { name: "Ada", exact: true }).click();

    // Scores are hidden on the big screen until the finale.
    await expect(screen.locator(".finale")).toHaveCount(0);

    // Reveal winner -> the big screen shows the standings with Ada on top.
    await mod.getByRole("button", { name: "Reveal winner" }).click();
    await expect(screen.locator(".finale")).toBeVisible();
    await expect(screen.locator(".finale-row.winner")).toContainText("Ada");
    await expect(screen.locator(".finale-row.winner")).toContainText("100");

    // Hide winner -> the finale goes away.
    await mod.getByRole("button", { name: "Hide winner" }).click();
    await expect(screen.locator(".finale")).toHaveCount(0);

    await screenCtx.close();
    await modCtx.close();
  });
});

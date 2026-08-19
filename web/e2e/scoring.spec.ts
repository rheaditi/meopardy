import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// Asserts against the test fixture (web/e2e/fixtures/game.json): players
// Ada/Bo/Cy. Awarding gives the open cell's points to a chosen player and
// closes the cell; undo reverts it. Closing with no winner leaves scores
// untouched.
test.describe("scoring", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  const adaScore = (page: import("@playwright/test").Page) =>
    page.locator(".score-chip").filter({ hasText: "Ada" }).locator(".score-value");

  test("award gives the cell's points to a player; undo reverts it", async ({ page }) => {
    await page.goto("/moderator?transport=ws");

    await expect(adaScore(page)).toHaveText("0");

    // Open the Alpha 100 cell and award it to Ada.
    await page.getByRole("button", { name: "100", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Ada", exact: true }).click();

    await expect(adaScore(page)).toHaveText("100");
    // The awarded cell is now done (disabled) on the board.
    await expect(page.getByRole("button", { name: "100", exact: true })).toBeDisabled();

    // Undo reverts the award.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(adaScore(page)).toHaveText("0");
  });

  test("closing with no winner leaves scores unchanged", async ({ page }) => {
    await page.goto("/moderator?transport=ws");

    await page.getByRole("button", { name: "100", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Close — no winner" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(adaScore(page)).toHaveText("0");
    await expect(page.getByRole("button", { name: "100", exact: true })).toBeDisabled();
  });
});

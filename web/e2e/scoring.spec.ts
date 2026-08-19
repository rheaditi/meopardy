import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// Awarding gives the open cell's points to a chosen player and closes the cell;
// undo reverts it. Closing with no winner leaves scores untouched.
test.describe("scoring", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  const alexScore = (page: import("@playwright/test").Page) =>
    page.locator(".score-chip").filter({ hasText: "Alex" }).locator(".score-value");

  test("award gives the cell's points to a player; undo reverts it", async ({ page }) => {
    await page.goto("/moderator?transport=ws");

    await expect(alexScore(page)).toHaveText("0");

    // Open the top-left 50-point cell and award it to Alex.
    await page.getByRole("button", { name: "50", exact: true }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Alex", exact: true }).click();

    await expect(alexScore(page)).toHaveText("50");
    // The awarded cell is now done (disabled) on the board.
    await expect(page.getByRole("button", { name: "50", exact: true }).first()).toBeDisabled();

    // Undo reverts the award.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(alexScore(page)).toHaveText("0");
  });

  test("closing with no winner leaves scores unchanged", async ({ page }) => {
    await page.goto("/moderator?transport=ws");

    await page.getByRole("button", { name: "50", exact: true }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Close — no winner" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(alexScore(page)).toHaveText("0");
    await expect(page.getByRole("button", { name: "50", exact: true }).first()).toBeDisabled();
  });
});

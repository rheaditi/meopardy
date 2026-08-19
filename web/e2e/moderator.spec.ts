import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// Asserts against the test fixture (web/e2e/fixtures/game.json). The moderator
// view is the control surface: cells are clickable, opening one reveals the
// prompt plus the answer/hint (which never appears on the big screen), and the
// cell can then be closed.
test.describe("moderator", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  test("opening a cell reveals the answer, closing it greys the cell out", async ({ page }) => {
    await page.goto("/moderator");
    await expect(page.getByText("Moderator")).toBeVisible();

    // The category description is available as a hover tooltip here.
    await expect(page.locator(".cat-head").filter({ hasText: "Alpha" })).toHaveAttribute(
      "title",
      "Alpha category note",
    );

    // The Alpha 100 cell (unique point value in the fixture).
    const cell = page.getByRole("button", { name: "100", exact: true });
    await expect(cell).toBeEnabled();
    await cell.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Prompt (read aloud)")).toBeVisible();
    await expect(dialog.getByText("Alpha one prompt")).toBeVisible();
    // Scope the answer to its field.
    await expect(dialog.locator(".field.answer")).toContainText("Alpha one answer");

    await dialog.getByRole("button", { name: "Close — no winner" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(cell).toBeDisabled();
  });

  test("Back dismisses the cell without marking it done", async ({ page }) => {
    await page.goto("/moderator");

    const cell = page.getByRole("button", { name: "100", exact: true });
    await cell.click();
    await page.getByRole("dialog").getByRole("button", { name: "Back" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(cell).toBeEnabled();
  });
});

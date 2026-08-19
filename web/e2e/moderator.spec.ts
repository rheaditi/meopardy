import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// The moderator view is the control surface: cells are clickable, opening one
// reveals the prompt plus the answer/hint (which never appears on the big
// screen), and the cell can then be closed.
test.describe("moderator", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  test("opening a cell reveals the answer, closing it greys the cell out", async ({ page }) => {
    await page.goto("/moderator");
    await expect(page.getByText("Moderator")).toBeVisible();

    // The top-left cell of the first category ("Because Seven, Eight, Nine").
    const firstCell = page.getByRole("button", { name: "50", exact: true }).first();
    await expect(firstCell).toBeEnabled();
    await firstCell.click();

    // The reveal modal shows the prompt and the moderator-only answer.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Prompt (read aloud)")).toBeVisible();
    await expect(dialog.getByText("The number of days in a week.")).toBeVisible();
    // Scope to the answer field — "Seven" also appears in the category name.
    await expect(dialog.locator(".field.answer")).toContainText("Seven");

    // Close the cell: modal disappears and the cell is now disabled (done).
    await dialog.getByRole("button", { name: "Close — no winner" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(firstCell).toBeDisabled();
  });

  test("Back dismisses the cell without marking it done", async ({ page }) => {
    await page.goto("/moderator");

    const firstCell = page.getByRole("button", { name: "50", exact: true }).first();
    await firstCell.click();
    await page.getByRole("dialog").getByRole("button", { name: "Back" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(firstCell).toBeEnabled();
  });
});

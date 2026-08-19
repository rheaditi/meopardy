import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// Asserts against the test fixture (web/e2e/fixtures/game.json), not the real
// games/ files. The big-screen (public) view is read-only: it shows the board
// but reveals no answers and offers no controls.
test.describe("big screen", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  test("shows the game title and the full board", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Test Board" })).toBeVisible();

    // All three fixture categories.
    await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
    await expect(page.getByText("Beta", { exact: true })).toBeVisible();
    await expect(page.getByText("Gamma", { exact: true })).toBeVisible();

    // A point cell renders.
    await expect(page.getByText("100", { exact: true })).toBeVisible();
  });

  test("does not expose moderator controls or answers", async ({ page }) => {
    await page.goto("/");

    // Cells are static text, not clickable buttons, on the big screen.
    await expect(page.getByRole("button", { name: "100", exact: true })).toHaveCount(0);
    // No answer text leaks to the shared screen.
    await expect(page.getByText("Alpha one answer")).toHaveCount(0);
  });
});

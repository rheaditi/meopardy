import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// The big-screen (public) view is read-only: it shows the board but reveals no
// answers and offers no controls.
test.describe("big screen", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  test("shows the game title and the full board", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Friday Night Meopardy" })).toBeVisible();
    await expect(page.getByText("Big screen")).toBeVisible();

    // Five categories from the sample game.
    await expect(page.getByText("HI-STORY!")).toBeVisible();
    await expect(page.getByText("MAP ATTACK")).toBeVisible();

    // Point cells render (four "50" cells, one per column top row + one).
    await expect(page.getByText("50", { exact: true }).first()).toBeVisible();
  });

  test("does not expose moderator controls or answers", async ({ page }) => {
    await page.goto("/");

    // Cells are static text, not clickable buttons, on the big screen.
    await expect(page.getByRole("button", { name: "50", exact: true })).toHaveCount(0);
    // No answer text leaks to the shared screen.
    await expect(page.getByText("The Berlin Wall")).toHaveCount(0);
  });
});

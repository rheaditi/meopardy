import { test, expect } from "@playwright/test";

// Dark mode is the default; the toggle flips it and the choice persists across
// reloads (stored in localStorage).
test.describe("dark mode", () => {
  test("defaults to dark and toggles to light", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

import { test, expect } from "@playwright/test";

// The transport (WebSocket vs polling) is switchable per screen, defaults to
// polling, persists across reloads, and can be preset via a query param.
test.describe("transport switch", () => {
  test("defaults to polling and toggles to WebSocket, persisting across reload", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByRole("button", { name: "Switch live-update transport" });
    await expect(toggle).toHaveText(/Polling/);

    await toggle.click();
    await expect(toggle).toHaveText(/WebSocket/);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Switch live-update transport" }),
    ).toHaveText(/WebSocket/);
  });

  test("a ?transport=ws query param preselects WebSocket", async ({ page }) => {
    await page.goto("/?transport=ws");
    await expect(
      page.getByRole("button", { name: "Switch live-update transport" }),
    ).toHaveText(/WebSocket/);
  });
});

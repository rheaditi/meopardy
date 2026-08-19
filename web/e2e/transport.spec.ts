import { test, expect } from "@playwright/test";

// The transport (WebSocket vs polling) is switchable per screen, defaults to
// polling, persists across reloads, and can be preset via a query param. On the
// big screen it's the floating dock button; its title reflects the current mode.
test.describe("transport switch", () => {
  test("defaults to polling and toggles to WebSocket, persisting across reload", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByRole("button", { name: "Switch live-update transport" });
    await expect(toggle).toHaveAttribute("title", /^Polling/);

    await toggle.click();
    await expect(toggle).toHaveAttribute("title", /^WebSocket/);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Switch live-update transport" }),
    ).toHaveAttribute("title", /^WebSocket/);
  });

  test("a ?transport=ws query param preselects WebSocket", async ({ page }) => {
    await page.goto("/?transport=ws");
    await expect(
      page.getByRole("button", { name: "Switch live-update transport" }),
    ).toHaveAttribute("title", /^WebSocket/);
  });
});

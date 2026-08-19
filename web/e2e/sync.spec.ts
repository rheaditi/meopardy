import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// The core of Phase 2: the big screen and the moderator are two separate
// clients of one server-side game state. An action on the moderator must show
// up on the big screen live, with no reload.
test.describe("live sync", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  test("big screen mirrors the moderator opening and closing a cell", async ({ browser }) => {
    const screenCtx = await browser.newContext();
    const modCtx = await browser.newContext();
    const screen = await screenCtx.newPage();
    const mod = await modCtx.newPage();

    await screen.goto("/");
    await mod.goto("/moderator");

    // Nothing highlighted or done to start.
    await expect(screen.locator(".cell.active")).toHaveCount(0);
    await expect(screen.locator(".cell.done")).toHaveCount(0);

    // Moderator opens a cell -> big screen highlights exactly that cell live.
    await mod.getByRole("button", { name: "50", exact: true }).first().click();
    await expect(screen.locator(".cell.active")).toHaveCount(1);
    await expect(screen.locator(".cell.active")).toHaveText("50");

    // Moderator closes the cell -> big screen greys that cell and clears the
    // highlight, again with no reload.
    await mod.getByRole("dialog").getByRole("button", { name: "Close cell" }).click();
    await expect(screen.locator(".cell.active")).toHaveCount(0);
    await expect(screen.locator(".cell.done")).toHaveCount(1);
    await expect(screen.locator(".cell.done")).toHaveText("50");

    await screenCtx.close();
    await modCtx.close();
  });

  test("reset clears the board on the big screen", async ({ browser, request }) => {
    const screenCtx = await browser.newContext();
    const modCtx = await browser.newContext();
    const screen = await screenCtx.newPage();
    const mod = await modCtx.newPage();

    await screen.goto("/");
    await mod.goto("/moderator");

    // Answer a cell so there is something to clear.
    await mod.getByRole("button", { name: "50", exact: true }).first().click();
    await mod.getByRole("dialog").getByRole("button", { name: "Close cell" }).click();
    await expect(screen.locator(".cell.done")).toHaveCount(1);

    // Reset via the API (avoids driving the confirm() dialog) and confirm the
    // big screen clears live.
    await resetBoard(request);
    await expect(screen.locator(".cell.done")).toHaveCount(0);

    await screenCtx.close();
    await modCtx.close();
  });
});

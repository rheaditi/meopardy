import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// The core of Phase 2: the big screen and the moderator are two separate
// clients of one server-side game state. An action on the moderator must show
// up on the big screen live. This must hold for BOTH transports, selected via
// the ?transport= query param.
for (const transport of ["poll", "ws"] as const) {
  test.describe(`live sync over ${transport}`, () => {
    test.beforeEach(async ({ request }) => resetBoard(request));

    const q = `?transport=${transport}`;

    test("big screen mirrors the moderator opening and closing a cell", async ({ browser }) => {
      const screenCtx = await browser.newContext();
      const modCtx = await browser.newContext();
      const screen = await screenCtx.newPage();
      const mod = await modCtx.newPage();

      await screen.goto(`/${q}`);
      await mod.goto(`/moderator${q}`);

      await expect(screen.locator(".cell.active")).toHaveCount(0);
      await expect(screen.locator(".cell.done")).toHaveCount(0);

      // Moderator opens a cell -> big screen highlights exactly that cell.
      await mod.getByRole("button", { name: "50", exact: true }).first().click();
      await expect(screen.locator(".cell.active")).toHaveCount(1);
      await expect(screen.locator(".cell.active")).toHaveText("50");

      // Moderator closes the cell -> big screen greys it and clears the highlight.
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

      await screen.goto(`/${q}`);
      await mod.goto(`/moderator${q}`);

      await mod.getByRole("button", { name: "50", exact: true }).first().click();
      await mod.getByRole("dialog").getByRole("button", { name: "Close cell" }).click();
      await expect(screen.locator(".cell.done")).toHaveCount(1);

      await resetBoard(request);
      await expect(screen.locator(".cell.done")).toHaveCount(0);

      await screenCtx.close();
      await modCtx.close();
    });
  });
}

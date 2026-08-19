import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// Asserts against the test fixture (web/e2e/fixtures/game.json). The big screen
// and the moderator are two separate clients of one server-side game state; an
// action on the moderator must show up on the big screen live. This must hold
// for BOTH transports, selected via the ?transport= query param.
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

      // Moderator opens the Alpha 100 cell -> big screen highlights it.
      await mod.getByRole("button", { name: "100", exact: true }).click();
      await expect(screen.locator(".cell.active")).toHaveCount(1);
      await expect(screen.locator(".cell.active")).toHaveText("100");

      // Moderator closes the cell -> big screen greys it and clears the highlight.
      await mod.getByRole("dialog").getByRole("button", { name: "Close — no winner" }).click();
      await expect(screen.locator(".cell.active")).toHaveCount(0);
      await expect(screen.locator(".cell.done")).toHaveCount(1);
      await expect(screen.locator(".cell.done")).toHaveText("100");

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

      await mod.getByRole("button", { name: "100", exact: true }).click();
      await mod.getByRole("dialog").getByRole("button", { name: "Close — no winner" }).click();
      await expect(screen.locator(".cell.done")).toHaveCount(1);

      await resetBoard(request);
      await expect(screen.locator(".cell.done")).toHaveCount(0);

      await screenCtx.close();
      await modCtx.close();
    });
  });
}

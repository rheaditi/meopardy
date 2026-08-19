import { test, expect } from "@playwright/test";
import { resetBoard } from "./helpers";

// The Final Beopardy round (fixture finalRound: 2 questions, 150 pts, 30s).
// The moderator starts the round, reveals a question with its image, runs the
// timer, marks correct players, advances, and reveals the winner — all mirrored
// live on the big screen.
test.describe("final round", () => {
  test.beforeEach(async ({ request }) => resetBoard(request));

  test("moderator runs the final round and the big screen follows", async ({ browser }) => {
    const screenCtx = await browser.newContext();
    const modCtx = await browser.newContext();
    const screen = await screenCtx.newPage();
    const mod = await modCtx.newPage();

    await screen.goto("/?transport=ws");
    await mod.goto("/moderator?transport=ws");

    // Start the final round -> both screens switch to it.
    await mod.getByRole("button", { name: /Start Final Beopardy/ }).click();
    await expect(mod.getByText("Final Beopardy · Question 1 of 2")).toBeVisible();
    await expect(screen.getByText("Final Beopardy · Question 1 of 2")).toBeVisible();
    // Not revealed yet: the question text isn't on the big screen.
    await expect(screen.getByText("Final one prompt")).toHaveCount(0);

    // Reveal -> big screen shows the prompt and the image.
    await mod.getByRole("button", { name: "Show question on big screen" }).click();
    await expect(screen.getByText("Final one prompt")).toBeVisible();
    await expect(screen.locator(".final-image")).toHaveAttribute("src", "/assets/rebus-1.png");
    // The answer never reaches the big screen.
    await expect(screen.getByText("Final one answer")).toHaveCount(0);

    // Start the timer -> a countdown appears on the big screen.
    await mod.getByRole("button", { name: /Start timer/ }).click();
    await expect(screen.locator(".final-timer")).toBeVisible();

    // Mark two players correct (toggle).
    await mod.getByRole("button", { name: "Ada", exact: true }).click();
    await expect(mod.getByRole("button", { name: "✓ Ada" })).toBeVisible();
    await mod.getByRole("button", { name: "Bo", exact: true }).click();

    // Next question.
    await mod.getByRole("button", { name: "Next", exact: true }).click();
    await expect(mod.getByText("Final Beopardy · Question 2 of 2")).toBeVisible();
    await expect(screen.getByText("Final Beopardy · Question 2 of 2")).toBeVisible();

    // Reveal winner -> standings show Ada and Bo at 150 on the big screen.
    await mod.getByRole("button", { name: "Reveal winner" }).click();
    await expect(screen.locator(".finale")).toBeVisible();
    await expect(
      screen.locator(".finale-row").filter({ hasText: "Ada" }),
    ).toContainText("150");

    await screenCtx.close();
    await modCtx.close();
  });
});

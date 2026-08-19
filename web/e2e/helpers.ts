import type { APIRequestContext } from "@playwright/test";

// resetBoard clears all server-side game state so each test starts clean.
export async function resetBoard(request: APIRequestContext): Promise<void> {
  await request.post("/api/action", { data: { type: "reset" } });
}

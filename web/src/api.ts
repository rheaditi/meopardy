import type { CellRef, Game, GameState } from "./types";

// fetchGame loads the current board definition from the Go server.
export async function fetchGame(): Promise<Game> {
  const res = await fetch("/api/game");
  if (!res.ok) {
    throw new Error(`failed to load game (${res.status})`);
  }
  return (await res.json()) as Game;
}

export type ActionType =
  | "open"
  | "reveal"
  | "hide"
  | "award"
  | "cancel"
  | "close"
  | "undo"
  | "reset";

// postAction sends a moderator command to the server and returns the resulting
// game state, so the caller can update its screen optimistically.
export async function postAction(
  type: ActionType,
  opts: { cell?: CellRef; player?: string } = {},
): Promise<GameState> {
  const body = {
    type,
    category: opts.cell?.category ?? 0,
    row: opts.cell?.row ?? 0,
    player: opts.player ?? "",
  };
  const res = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`action "${type}" failed (${res.status})`);
  }
  return (await res.json()) as GameState;
}

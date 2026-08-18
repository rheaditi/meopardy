import type { Game } from "./types";

// fetchGame loads the current board definition from the Go server.
export async function fetchGame(): Promise<Game> {
  const res = await fetch("/api/game");
  if (!res.ok) {
    throw new Error(`failed to load game (${res.status})`);
  }
  return (await res.json()) as Game;
}

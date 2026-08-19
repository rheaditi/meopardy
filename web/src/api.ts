import type { CellRef, Game, GameState } from "./types";

// fetchGame loads the current board definition from the Go server (the passkey
// is stripped server-side and never reaches the client).
export async function fetchGame(): Promise<Game> {
  const res = await fetch("/api/game");
  if (!res.ok) {
    throw new Error(`failed to load game (${res.status})`);
  }
  return (await res.json()) as Game;
}

// ---- Moderator passkey ----

const PASSKEY_KEY = "meopardy-passkey";

export function getPasskey(): string {
  return localStorage.getItem(PASSKEY_KEY) ?? "";
}

export function setPasskey(value: string): void {
  localStorage.setItem(PASSKEY_KEY, value);
}

// fetchConfig reports whether the moderator view requires a passkey.
export async function fetchConfig(): Promise<{ passkeyRequired: boolean }> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`failed to load config (${res.status})`);
  return (await res.json()) as { passkeyRequired: boolean };
}

// authenticate checks a passkey with the server; on success it's stored so
// later actions carry it.
export async function authenticate(passkey: string): Promise<boolean> {
  const res = await fetch("/api/moderator/auth", {
    method: "POST",
    headers: { "X-Meopardy-Passkey": passkey },
  });
  if (res.ok) {
    setPasskey(passkey);
    return true;
  }
  return false;
}

// ---- Actions ----

export type ActionType =
  | "open"
  | "reveal"
  | "hide"
  | "award"
  | "cancel"
  | "close"
  | "undo"
  | "finale"
  | "hideFinale"
  | "reset";

// postAction sends a moderator command to the server and returns the resulting
// game state, so the caller can update its screen optimistically. The stored
// passkey (if any) is sent so the server accepts the command.
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
    headers: { "Content-Type": "application/json", "X-Meopardy-Passkey": getPasskey() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`action "${type}" failed (${res.status})`);
  }
  return (await res.json()) as GameState;
}

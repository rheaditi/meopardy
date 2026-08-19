// Mirrors the JSON shape served by GET /api/game (see internal/game/game.go).

export interface Cell {
  points: number;
  prompt: string;
  answer: string;
  hint?: string;
}

export interface Category {
  name: string;
  cells: Cell[];
}

export interface Game {
  title: string;
  categories: Category[];
}

// A stable key for one cell on the board, used to track which cells are done.
// Must match the server's cellKey (see internal/server/server.go).
export function cellKey(categoryIndex: number, rowIndex: number): string {
  return `${categoryIndex}:${rowIndex}`;
}

// CellRef identifies a cell by column and row, matching the server.
export interface CellRef {
  category: number;
  row: number;
}

// GameState is the live, server-authoritative state pushed to every screen.
// It carries no answer text — answers are looked up client-side from the game.
export interface GameState {
  done: Record<string, boolean>;
  openCell: CellRef | null;
}

// doneSet converts the wire format into a Set of "category:row" keys.
export function doneSet(state: GameState | null): Set<string> {
  if (!state) return new Set();
  return new Set(Object.entries(state.done).filter(([, v]) => v).map(([k]) => k));
}

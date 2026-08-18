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
export function cellKey(categoryIndex: number, rowIndex: number): string {
  return `${categoryIndex}:${rowIndex}`;
}

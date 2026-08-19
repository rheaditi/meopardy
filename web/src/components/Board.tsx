import type { Game } from "../types";
import { cellKey } from "../types";
import { columnColor } from "../constants";

interface BoardProps {
  game: Game;
  done: Set<string>;
  // The cell currently in play, highlighted on every screen. Null when none.
  activeKey?: string | null;
  // When set, cells are clickable buttons (moderator). Omit for the read-only
  // public view.
  onCellClick?: (categoryIndex: number, rowIndex: number) => void;
}

// Board renders the category headers and the grid of point cells. Answered
// ("done") cells are greyed out. Layout adapts to the number of categories and
// the tallest column.
export function Board({ game, done, activeKey, onCellClick }: BoardProps) {
  const cols = game.categories.length;
  const rows = Math.max(...game.categories.map((c) => c.cells.length));
  const interactive = Boolean(onCellClick);

  return (
    <div
      className="board"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {game.categories.map((cat, ci) => (
        <div className="cat-head" key={`h-${ci}`}>
          {cat.name}
        </div>
      ))}

      {Array.from({ length: rows }).map((_, ri) =>
        game.categories.map((cat, ci) => {
          const cell = cat.cells[ri];
          if (!cell) {
            return <div key={cellKey(ci, ri)} />;
          }
          const key = cellKey(ci, ri);
          const isDone = done.has(key);
          const isActive = !isDone && key === activeKey;
          const color = columnColor(ci);
          const style = isDone
            ? undefined
            : { background: color.bg, color: color.fg };
          const className = `cell${isDone ? " done" : ""}${isActive ? " active" : ""}`;

          if (interactive) {
            return (
              <button
                key={key}
                className={className}
                style={style}
                disabled={isDone}
                onClick={() => onCellClick?.(ci, ri)}
              >
                {cell.points}
              </button>
            );
          }
          return (
            <div key={key} className={className} style={style}>
              {cell.points}
            </div>
          );
        }),
      )}
    </div>
  );
}

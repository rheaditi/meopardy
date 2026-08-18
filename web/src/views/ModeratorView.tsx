import { useState } from "react";
import type { Game } from "../types";
import { cellKey } from "../types";
import { Board } from "../components/Board";
import { CellModal } from "../components/CellModal";

interface ModeratorViewProps {
  game: Game;
}

interface OpenCell {
  categoryIndex: number;
  rowIndex: number;
}

// ModeratorView is the control surface (the iPad). Tapping a cell opens it and
// reveals the answer. In Phase 1 the "done" set is local component state so the
// flow is demoable; Phase 2 moves it to the server so the big screen mirrors it,
// and Phase 3 adds player scoring with commit + undo.
export function ModeratorView({ game }: ModeratorViewProps) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<OpenCell | null>(null);

  const openCell = open ? game.categories[open.categoryIndex]?.cells[open.rowIndex] : null;

  function closeCell() {
    if (!open) return;
    setDone((prev) => {
      const next = new Set(prev);
      next.add(cellKey(open.categoryIndex, open.rowIndex));
      return next;
    });
    setOpen(null);
  }

  return (
    <>
      <div className="notice">
        Phase 1 preview — tapping a cell reveals the answer and lets you close it.
        Live sync to the big screen and player scoring come next.
      </div>
      <div className="board-wrap">
        <Board
          game={game}
          done={done}
          onCellClick={(ci, ri) => setOpen({ categoryIndex: ci, rowIndex: ri })}
        />
      </div>
      {open && openCell && (
        <CellModal
          categoryName={game.categories[open.categoryIndex].name}
          cell={openCell}
          onClose={() => setOpen(null)}
          onCloseCell={closeCell}
        />
      )}
    </>
  );
}

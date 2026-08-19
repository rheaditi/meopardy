import type { Game } from "../types";
import { cellKey, doneSet } from "../types";
import { postAction } from "../api";
import { Board } from "../components/Board";
import { CellModal } from "../components/CellModal";
import { useGameState } from "../useGameState";

interface ModeratorViewProps {
  game: Game;
}

// ModeratorView is the control surface (the iPad). It reads the same live server
// state as the big screen, so the two are always in sync, and it drives the game
// by posting actions. Opening a cell highlights it on the big screen and reveals
// the answer here; closing it marks it answered everywhere.
export function ModeratorView({ game }: ModeratorViewProps) {
  const { state, apply } = useGameState();
  const done = doneSet(state);
  const open = state?.openCell ?? null;
  const openCell = open ? game.categories[open.category]?.cells[open.row] : null;
  const activeKey = open ? cellKey(open.category, open.row) : null;

  function report(err: unknown) {
    // Actions are best-effort; the SSE stream is the source of truth. Log for
    // debugging rather than interrupting the moderator mid-game.
    console.error(err);
  }

  return (
    <>
      <div className="notice">
        <span>Live — the big screen mirrors this board in real time.</span>
        <button
          className="notice-btn"
          onClick={() => {
            if (confirm("Reset the whole board? All answered cells will reopen.")) {
              postAction("reset").then(apply).catch(report);
            }
          }}
        >
          Reset board
        </button>
      </div>
      <div className="board-wrap">
        <Board
          game={game}
          done={done}
          activeKey={activeKey}
          onCellClick={(ci, ri) => postAction("open", { category: ci, row: ri }).then(apply).catch(report)}
        />
      </div>
      {open && openCell && (
        <CellModal
          categoryName={game.categories[open.category].name}
          cell={openCell}
          onClose={() => postAction("cancel").then(apply).catch(report)}
          onCloseCell={() => postAction("close").then(apply).catch(report)}
        />
      )}
    </>
  );
}

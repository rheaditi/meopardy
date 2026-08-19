import type { Game } from "../types";
import { cellKey, doneSet } from "../types";
import { Board } from "../components/Board";
import { useGameState } from "../useGameState";

interface PublicViewProps {
  game: Game;
}

// PublicView is the read-only big-screen board. It reflects the live server
// state: answered cells grey out and the cell in play is highlighted — all
// driven by whatever the moderator does.
export function PublicView({ game }: PublicViewProps) {
  const { state } = useGameState();
  const done = doneSet(state);
  const activeKey = state?.openCell
    ? cellKey(state.openCell.category, state.openCell.row)
    : null;

  return (
    <div className="board-wrap">
      <Board game={game} done={done} activeKey={activeKey} />
    </div>
  );
}

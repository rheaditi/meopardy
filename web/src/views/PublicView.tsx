import type { Game } from "../types";
import { Board } from "../components/Board";

interface PublicViewProps {
  game: Game;
}

// PublicView is the read-only big-screen board. In later phases it will also
// show the revealed prompt and the live scoreboard, driven by the server.
export function PublicView({ game }: PublicViewProps) {
  return (
    <div className="board-wrap">
      <Board game={game} done={new Set()} />
    </div>
  );
}

import type { Game } from "../types";
import { cellKey, doneSet } from "../types";
import { Board } from "../components/Board";
import { useGameState } from "../useGameState";
import type { Transport } from "../useTransport";
import type { Theme } from "../useTheme";

interface PublicViewProps {
  game: Game;
  transport: Transport;
  theme: Theme;
  onToggleTransport: () => void;
  onToggleTheme: () => void;
}

// PublicView is the read-only big-screen board. It has no top nav (which a TV
// tends to clip via overscan); instead the title sits just above the board, the
// whole thing is centered at ~80% of the viewport, and the display controls
// float in a dock beside the board.
export function PublicView({
  game,
  transport,
  theme,
  onToggleTransport,
  onToggleTheme,
}: PublicViewProps) {
  const { state } = useGameState(transport);
  const done = doneSet(state);
  const activeKey = state?.openCell
    ? cellKey(state.openCell.category, state.openCell.row)
    : null;

  return (
    <div className="stage">
      <div className="stage-inner">
        <h1 className="stage-title">{game.title}</h1>
        <Board game={game} done={done} activeKey={activeKey} fill />
      </div>

      <div className="dock" role="group" aria-label="Display controls">
        <button
          className="dock-btn"
          onClick={onToggleTransport}
          aria-label="Switch live-update transport"
          title={
            transport === "ws"
              ? "WebSocket — click for polling"
              : "Polling — click for WebSocket"
          }
        >
          {transport === "ws" ? "⚡" : "↻"}
        </button>
        <button
          className="dock-btn"
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </div>
  );
}

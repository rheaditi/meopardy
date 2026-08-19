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
  const open = state?.openCell ?? null;
  const activeKey = open ? cellKey(open.category, open.row) : null;
  const revealedCell =
    open && state?.revealed ? game.categories[open.category]?.cells[open.row] : null;

  const showFinale = Boolean(state?.showFinale);
  const players = game.players ?? [];
  const scores = state?.scores ?? {};
  const ranked = [...players]
    .map((name) => ({ name, score: scores[name] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const topScore = ranked.length ? ranked[0].score : 0;

  return (
    <div className="stage">
      <div className="stage-inner">
        <h1 className="stage-title">{game.title}</h1>
        <Board game={game} done={done} activeKey={activeKey} fill />
      </div>

      {showFinale ? (
        <div className="finale">
          <div className="finale-title">Final scores</div>
          <ol className="finale-list">
            {ranked.map((r, i) => (
              <li
                key={r.name}
                className={`finale-row${r.score === topScore && topScore > 0 ? " winner" : ""}`}
              >
                <span className="finale-rank">{i + 1}</span>
                <span className="finale-name">{r.name}</span>
                <span className="finale-score">{r.score}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        revealedCell &&
        open && (
          <div className="reveal">
            <div className="reveal-meta">
              {game.categories[open.category].name} · {revealedCell.points}
            </div>
            <div className="reveal-prompt">{revealedCell.prompt}</div>
          </div>
        )
      )}

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

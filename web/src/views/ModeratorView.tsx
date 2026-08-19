import { useState } from "react";
import type { Game, GameState } from "../types";
import { cellKey, doneSet } from "../types";
import { postAction } from "../api";
import { Board } from "../components/Board";
import { CellModal } from "../components/CellModal";
import { FinalModeratorView } from "./FinalModeratorView";
import { useGameState } from "../useGameState";
import type { Transport } from "../useTransport";

interface ModeratorViewProps {
  game: Game;
  transport: Transport;
}

// ModeratorView is the control surface (the iPad). It reads the same live server
// state as the big screen and drives the game by posting actions: open a cell,
// reveal the question, award the points to a player (or close with no winner),
// undo mistakes, and reset the board.
export function ModeratorView({ game, transport }: ModeratorViewProps) {
  const { state, apply } = useGameState(transport);
  const done = doneSet(state);
  const open = state?.openCell ?? null;
  const openCell = open ? game.categories[open.category]?.cells[open.row] : null;
  const activeKey = open ? cellKey(open.category, open.row) : null;
  const revealed = Boolean(state?.revealed);
  const players = game.players ?? [];
  const scores = state?.scores ?? {};

  function report(err: unknown) {
    // Actions are best-effort; the server state is the source of truth. Log for
    // debugging rather than interrupting the moderator mid-game.
    console.error(err);
  }

  const run = (p: Promise<GameState>) => p.then(apply).catch(report);
  const [confirmReset, setConfirmReset] = useState(false);

  // In the final phase the moderator drives the final round instead of the board.
  if (state?.phase === "final" && game.finalRound) {
    return <FinalModeratorView game={game} state={state} run={run} />;
  }

  return (
    <>
      <div className="notice">
        <span>Live — the big screen mirrors this board in real time.</span>
        <div className="notice-actions">
          {game.finalRound && (
            <button className="notice-btn" onClick={() => run(postAction("startFinal"))}>
              Start Final Beopardy →
            </button>
          )}
          <button
            className="notice-btn"
            onClick={() => run(postAction(state?.showFinale ? "hideFinale" : "finale"))}
          >
            {state?.showFinale ? "Hide winner" : "Reveal winner"}
          </button>
          <button className="notice-btn" onClick={() => run(postAction("undo"))}>
            Undo
          </button>
          <button
            className="notice-btn"
            onClick={() => {
              if (confirmReset) {
                run(postAction("reset"));
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 3000);
              }
            }}
          >
            {confirmReset ? "Confirm reset?" : "Reset"}
          </button>
        </div>
      </div>

      {players.length > 0 && (
        <div className="scores">
          {players.map((p) => (
            <div className="score-chip" key={p}>
              <span className="score-name">{p}</span>
              <span className="score-value">{scores[p] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      <div className="board-wrap">
        <Board
          game={game}
          done={done}
          activeKey={activeKey}
          onCellClick={(ci, ri) => run(postAction("open", { cell: { category: ci, row: ri } }))}
        />
      </div>

      {open && openCell && (
        <CellModal
          categoryName={game.categories[open.category].name}
          cell={openCell}
          players={players}
          revealed={revealed}
          onToggleReveal={() => run(postAction(revealed ? "hide" : "reveal"))}
          onAward={(player) => run(postAction("award", { player }))}
          onClose={() => run(postAction("cancel"))}
          onCloseCell={() => run(postAction("close"))}
        />
      )}
    </>
  );
}

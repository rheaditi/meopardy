import type { Game, GameState } from "../types";
import { postAction } from "../api";
import { useCountdown, formatClock } from "../useCountdown";

interface FinalModeratorViewProps {
  game: Game;
  state: GameState | null;
  run: (p: Promise<GameState>) => void;
}

// FinalModeratorView is the moderator's control for the final round: reveal the
// question, run the answer-writing timer, mark everyone who got it right
// (each toggle awards the round's points), then move to the next question.
export function FinalModeratorView({ game, state, run }: FinalModeratorViewProps) {
  const fr = game.finalRound!;
  const idx = state?.finalIndex ?? 0;
  const q = fr.questions[idx];
  const revealed = Boolean(state?.finalRevealed);
  const awarded = state?.finalAwarded ?? {};
  const remaining = useCountdown(state?.timerEndsAt ?? 0, state?.serverNow ?? 0);
  const players = game.players ?? [];
  const last = fr.questions.length - 1;

  return (
    <>
      <div className="notice">
        <span>
          Final Beopardy · Question {idx + 1} of {fr.questions.length}
        </span>
        <div className="notice-actions">
          <button className="notice-btn" disabled={idx === 0} onClick={() => run(postAction("finalPrev"))}>
            Prev
          </button>
          <button className="notice-btn" disabled={idx === last} onClick={() => run(postAction("finalNext"))}>
            Next
          </button>
          <button className="notice-btn" onClick={() => run(postAction("finale"))}>
            Reveal winner
          </button>
          <button className="notice-btn" onClick={() => run(postAction("undo"))}>
            Undo
          </button>
          <button className="notice-btn" onClick={() => run(postAction("showBoard"))}>
            Back to board
          </button>
        </div>
      </div>

      {players.length > 0 && (
        <div className="scores">
          {players.map((p) => (
            <div className="score-chip" key={p}>
              <span className="score-name">{p}</span>
              <span className="score-value">{state?.scores?.[p] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      <div className="final-mod">
        <div className="field prompt">
          <div className="field-label">Question {idx + 1} (read aloud)</div>
          <div className="field-value">{q?.prompt}</div>
        </div>

        {q?.image && <img className="final-mod-image" src={q.image} alt="" />}

        <div className="field answer">
          <div className="field-label">Answer{q?.hint ? " + hint" : ""} (moderator only)</div>
          <div className="field-value">
            {q?.answer}
            {q?.hint ? ` · hint: ${q.hint}` : ""}
          </div>
        </div>

        <button
          className={`btn reveal-toggle${revealed ? " on" : ""}`}
          onClick={() => run(postAction(revealed ? "finalHide" : "finalReveal"))}
        >
          {revealed ? "Hide question from big screen" : "Show question on big screen"}
        </button>

        <div className="final-timer-row">
          <button className="btn" onClick={() => run(postAction("finalStartTimer"))}>
            Start timer ({fr.timerSeconds}s)
          </button>
          {remaining !== null && (
            <span className={`final-timer-mod${remaining === 0 ? " done" : ""}`}>
              {remaining === 0 ? "Time!" : formatClock(remaining)}
            </span>
          )}
          {remaining !== null && (
            <button className="btn" onClick={() => run(postAction("finalStopTimer"))}>
              Stop
            </button>
          )}
        </div>

        <div className="award">
          <div className="field-label">Mark who got it right (+{fr.points} each)</div>
          <div className="award-players">
            {players.map((p) => (
              <button
                key={p}
                className={`btn award-btn${awarded[p] ? " on" : ""}`}
                onClick={() => run(postAction("finalToggle", { player: p }))}
              >
                {awarded[p] ? `✓ ${p}` : p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

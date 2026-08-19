import type { Game, GameState } from "../types";
import { useCountdown, formatClock } from "../useCountdown";

interface FinalPublicViewProps {
  game: Game;
  state: GameState;
}

// FinalPublicView is the big-screen final round: the question number always
// shows; the prompt and image appear when the moderator reveals them; the
// countdown shows while a timer is running. Answers never appear here.
export function FinalPublicView({ game, state }: FinalPublicViewProps) {
  const fr = game.finalRound!;
  const q = fr.questions[state.finalIndex];
  const remaining = useCountdown(state.timerEndsAt, state.serverNow ?? 0);

  return (
    <div className="final-stage">
      <div className="final-kicker">
        Final Beopardy · Question {state.finalIndex + 1} of {fr.questions.length}
      </div>

      {state.finalRevealed && q ? (
        <div className="final-body">
          {q.image && <img className="final-image" src={q.image} alt="" />}
          <div className="final-prompt">{q.prompt}</div>
        </div>
      ) : (
        <div className="final-waiting">Get ready…</div>
      )}

      {remaining !== null && (
        <div className={`final-timer${remaining === 0 ? " done" : ""}`}>
          {remaining === 0 ? "Time!" : formatClock(remaining)}
        </div>
      )}
    </div>
  );
}

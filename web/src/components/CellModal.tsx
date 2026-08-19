import type { Cell } from "../types";

interface CellModalProps {
  categoryName: string;
  cell: Cell;
  players: string[];
  revealed: boolean;
  onToggleReveal: () => void;
  onAward: (player: string) => void;
  onClose: () => void;
  onCloseCell: () => void;
}

// CellModal is the moderator's view of an open cell: it reveals the prompt plus
// the answer and hint (which the big screen never shows). The moderator reads
// the question aloud, taps "Show question on big screen" so players can read it,
// then awards the points to whoever got it right — or closes with no winner.
export function CellModal({
  categoryName,
  cell,
  players,
  revealed,
  onToggleReveal,
  onAward,
  onClose,
  onCloseCell,
}: CellModalProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-meta">
          {categoryName} · {cell.points} points
        </div>

        <div className="field prompt">
          <div className="field-label">Prompt (read aloud)</div>
          <div className="field-value">{cell.prompt}</div>
        </div>

        <div className="field answer">
          <div className="field-label">Answer{cell.hint ? " + hint" : ""} (moderator only)</div>
          <div className="field-value">
            {cell.answer}
            {cell.hint ? ` · hint: ${cell.hint}` : ""}
          </div>
        </div>

        <button
          className={`btn reveal-toggle${revealed ? " on" : ""}`}
          onClick={onToggleReveal}
        >
          {revealed ? "Hide question from big screen" : "Show question on big screen"}
        </button>

        {players.length > 0 && (
          <div className="award">
            <div className="field-label">Award {cell.points} points to</div>
            <div className="award-players">
              {players.map((p) => (
                <button key={p} className="btn award-btn" onClick={() => onAward(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Back
          </button>
          <button className="btn" onClick={onCloseCell}>
            Close — no winner
          </button>
        </div>
      </div>
    </div>
  );
}

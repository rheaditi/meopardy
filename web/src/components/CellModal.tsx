import type { Cell } from "../types";

interface CellModalProps {
  categoryName: string;
  cell: Cell;
  onClose: () => void;
  onCloseCell: () => void;
}

// CellModal is the moderator's view of an open cell: it reveals the prompt plus
// the answer and hint (which the big screen never shows). In Phase 1 the only
// action is closing the cell; awarding points to players arrives in Phase 3.
export function CellModal({ categoryName, cell, onClose, onCloseCell }: CellModalProps) {
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

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Back
          </button>
          <button className="btn primary" onClick={onCloseCell}>
            Close cell
          </button>
        </div>
      </div>
    </div>
  );
}

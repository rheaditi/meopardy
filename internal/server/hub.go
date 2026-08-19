package server

import "sync"

// CellRef identifies a cell by its category (column) and row indices.
type CellRef struct {
	Category int `json:"category"`
	Row      int `json:"row"`
}

// GameState is the authoritative game state read by every screen. It
// intentionally carries no answer text — answers stay moderator-side, looked up
// from the game definition the client already has.
type GameState struct {
	// Done maps "category:row" keys to true for answered (closed) cells.
	Done map[string]bool `json:"done"`
	// OpenCell is the cell currently in play (highlighted on the big screen,
	// revealed on the moderator's screen), or null when no cell is open.
	OpenCell *CellRef `json:"openCell"`
}

// hub owns the game state. Screens read it by polling GET /api/state; the
// moderator changes it via POST /api/action. It is safe for concurrent use.
type hub struct {
	mu    sync.Mutex
	state GameState
}

func newHub() *hub {
	return &hub{state: GameState{Done: map[string]bool{}}}
}

// snapshot returns a deep copy of the current state.
func (h *hub) snapshot() GameState {
	h.mu.Lock()
	defer h.mu.Unlock()
	return clone(h.state)
}

// mutate applies fn to the state under lock.
func (h *hub) mutate(fn func(*GameState)) {
	h.mu.Lock()
	defer h.mu.Unlock()
	fn(&h.state)
}

func clone(s GameState) GameState {
	done := make(map[string]bool, len(s.Done))
	for k, v := range s.Done {
		done[k] = v
	}
	var open *CellRef
	if s.OpenCell != nil {
		c := *s.OpenCell
		open = &c
	}
	return GameState{Done: done, OpenCell: open}
}

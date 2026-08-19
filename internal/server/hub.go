package server

import (
	"encoding/json"
	"sync"
)

// maxUndo bounds how far back the moderator can undo.
const maxUndo = 100

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
	// Revealed is true when the moderator has chosen to show the open cell's
	// question on the big screen for players to read.
	Revealed bool `json:"revealed"`
	// Scores maps each player name to their current score.
	Scores map[string]int `json:"scores"`
}

// hub owns the game state and fans out changes to connected WebSocket clients.
// It keeps an undo stack so the moderator can walk back mistakes. Safe for
// concurrent use.
type hub struct {
	mu      sync.Mutex
	state   GameState
	undo    []GameState
	subs    map[chan []byte]struct{}
	persist func(GameState) // optional; called with a snapshot after each change
}

func newHub(initial GameState, persist func(GameState)) *hub {
	return &hub{
		state:   initial,
		subs:    map[chan []byte]struct{}{},
		persist: persist,
	}
}

// subscribe registers a client and immediately queues the current state so a
// freshly-connected screen renders without waiting for the next change.
func (h *hub) subscribe() chan []byte {
	ch := make(chan []byte, 8)
	h.mu.Lock()
	h.subs[ch] = struct{}{}
	ch <- encode(h.state) // buffered + fresh channel: never blocks
	h.mu.Unlock()
	return ch
}

func (h *hub) unsubscribe(ch chan []byte) {
	h.mu.Lock()
	if _, ok := h.subs[ch]; ok {
		delete(h.subs, ch)
		close(ch)
	}
	h.mu.Unlock()
}

// snapshot returns a deep copy of the current state.
func (h *hub) snapshot() GameState {
	h.mu.Lock()
	defer h.mu.Unlock()
	return clone(h.state)
}

// mutate records the current state on the undo stack, applies fn, broadcasts,
// and persists. Every mutation is therefore undoable and saved.
func (h *hub) mutate(fn func(*GameState)) {
	h.mu.Lock()
	h.undo = append(h.undo, clone(h.state))
	if len(h.undo) > maxUndo {
		h.undo = h.undo[len(h.undo)-maxUndo:]
	}
	fn(&h.state)
	snap := clone(h.state)
	h.broadcastLocked()
	h.mu.Unlock()
	h.savePersist(snap)
}

// undoLast reverts the most recent mutation. Repeatable until the stack empties.
func (h *hub) undoLast() {
	h.mu.Lock()
	if len(h.undo) == 0 {
		h.mu.Unlock()
		return
	}
	h.state = h.undo[len(h.undo)-1]
	h.undo = h.undo[:len(h.undo)-1]
	snap := clone(h.state)
	h.broadcastLocked()
	h.mu.Unlock()
	h.savePersist(snap)
}

// savePersist writes a snapshot to disk outside the lock so file IO never
// blocks other requests.
func (h *hub) savePersist(snap GameState) {
	if h.persist != nil {
		h.persist(snap)
	}
}

func (h *hub) broadcastLocked() {
	msg := encode(h.state)
	for ch := range h.subs {
		select {
		case ch <- msg:
		default:
		}
	}
}

func clone(s GameState) GameState {
	done := make(map[string]bool, len(s.Done))
	for k, v := range s.Done {
		done[k] = v
	}
	scores := make(map[string]int, len(s.Scores))
	for k, v := range s.Scores {
		scores[k] = v
	}
	var open *CellRef
	if s.OpenCell != nil {
		c := *s.OpenCell
		open = &c
	}
	return GameState{Done: done, OpenCell: open, Revealed: s.Revealed, Scores: scores}
}

func encode(s GameState) []byte {
	b, _ := json.Marshal(clone(s))
	return b
}

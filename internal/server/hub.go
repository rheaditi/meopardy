package server

import (
	"encoding/json"
	"sync"
)

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
}

// hub owns the game state and fans out changes to connected WebSocket clients.
// The moderator changes state via POST /api/action; the hub then pushes the new
// state to every open socket. It is safe for concurrent use.
type hub struct {
	mu    sync.Mutex
	state GameState
	subs  map[chan []byte]struct{}
}

func newHub() *hub {
	return &hub{
		state: GameState{Done: map[string]bool{}},
		subs:  map[chan []byte]struct{}{},
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

// mutate applies fn to the state under lock, then broadcasts the new state to
// every subscriber. Slow subscribers that can't keep up are skipped for this
// update; they'll receive the next one (updates are whole-state snapshots).
func (h *hub) mutate(fn func(*GameState)) {
	h.mu.Lock()
	defer h.mu.Unlock()
	fn(&h.state)
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
	var open *CellRef
	if s.OpenCell != nil {
		c := *s.OpenCell
		open = &c
	}
	return GameState{Done: done, OpenCell: open, Revealed: s.Revealed}
}

func encode(s GameState) []byte {
	b, _ := json.Marshal(clone(s))
	return b
}

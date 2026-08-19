package server

import (
	"encoding/json"
	"sync"
	"time"
)

func nowMs() int64 { return time.Now().UnixMilli() }

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
	// ShowFinale is true when the moderator has triggered the end-game reveal of
	// the final scores on the big screen.
	ShowFinale bool `json:"showFinale"`

	// ---- Final round ----
	// Phase is "board" (the main grid) or "final" (the final round). Persisted,
	// so the game resumes in the right phase after a restart.
	Phase string `json:"phase"`
	// FinalIndex is the current final-round question (0-based).
	FinalIndex int `json:"finalIndex"`
	// FinalRevealed is true when the current final question is shown on the big
	// screen.
	FinalRevealed bool `json:"finalRevealed"`
	// FinalAwarded is the set of players marked correct for the current final
	// question (a toggle, so it can be corrected).
	FinalAwarded map[string]bool `json:"finalAwarded"`
	// TimerEndsAt is when the answer-writing countdown ends, in server unix
	// millis; 0 means no timer is running.
	TimerEndsAt int64 `json:"timerEndsAt"`
}

// wireState is what clients receive: the game state plus the server's current
// clock, so a client can compute the timer's remaining time without depending
// on its own (possibly skewed) clock.
type wireState struct {
	GameState
	ServerNow int64 `json:"serverNow"`
}

func toWire(s GameState) wireState {
	return wireState{GameState: s, ServerNow: nowMs()}
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
	awarded := make(map[string]bool, len(s.FinalAwarded))
	for k, v := range s.FinalAwarded {
		awarded[k] = v
	}
	var open *CellRef
	if s.OpenCell != nil {
		c := *s.OpenCell
		open = &c
	}
	return GameState{
		Done:          done,
		OpenCell:      open,
		Revealed:      s.Revealed,
		Scores:        scores,
		ShowFinale:    s.ShowFinale,
		Phase:         s.Phase,
		FinalIndex:    s.FinalIndex,
		FinalRevealed: s.FinalRevealed,
		FinalAwarded:  awarded,
		TimerEndsAt:   s.TimerEndsAt,
	}
}

func encode(s GameState) []byte {
	b, _ := json.Marshal(toWire(clone(s)))
	return b
}

// Package server wires up the Meopardy HTTP API and serves the built frontend.
//
// The server holds the authoritative game state. Screens receive it live over a
// WebSocket (GET /api/ws) — a one-shot GET /api/state is also available as a
// fallback — and the moderator drives the game with POST /api/action. The
// moderator passkey and disk persistence come in later phases.
package server

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"github.com/coder/websocket"

	"meopardy/internal/game"
)

// Server holds the dependencies shared across HTTP handlers.
type Server struct {
	game      *game.Game
	hub       *hub
	assets    fs.FS
	assetsDir string
	mux       *http.ServeMux
}

// New builds a Server. assets is the built frontend filesystem (embedded in
// production, or nil during development when Vite serves the UI itself).
// statePath, when non-empty, is a JSON file the live game state is saved to and
// resumed from across restarts.
func New(g *game.Game, assets fs.FS, statePath, assetsDir string) *Server {
	s := &Server{game: g, assets: assets, assetsDir: assetsDir, mux: http.NewServeMux()}

	initial := s.freshState()
	var persist func(GameState)
	if statePath != "" {
		store := &stateStore{path: statePath}
		if saved, ok := store.load(); ok {
			initial = s.reconcile(saved)
			log.Printf("resumed saved game state from %s", statePath)
		}
		persist = func(gs GameState) {
			if err := store.save(gs); err != nil {
				log.Printf("save state: %v", err)
			}
		}
	}

	s.hub = newHub(initial, persist)
	s.routes()
	return s
}

// freshState is a new game: no answered cells, every player at zero, on the
// board phase.
func (s *Server) freshState() GameState {
	scores := make(map[string]int, len(s.game.Players))
	for _, p := range s.game.Players {
		scores[p] = 0
	}
	return GameState{
		Done:         map[string]bool{},
		Scores:       scores,
		Phase:        "board",
		FinalAwarded: map[string]bool{},
	}
}

// reconcile merges a saved state onto a fresh one for the current game, so a
// changed board/roster can't produce phantom players or an open cell that no
// longer exists.
func (s *Server) reconcile(saved GameState) GameState {
	st := s.freshState()
	for _, p := range s.game.Players {
		if v, ok := saved.Scores[p]; ok {
			st.Scores[p] = v
		}
	}
	for k, done := range saved.Done {
		if done {
			st.Done[k] = true
		}
	}
	if saved.OpenCell != nil && s.validCell(saved.OpenCell.Category, saved.OpenCell.Row) {
		c := *saved.OpenCell
		st.OpenCell = &c
		st.Revealed = saved.Revealed
	}

	// Final-round phase, clamped to what the current game supports.
	st.ShowFinale = saved.ShowFinale
	st.Phase = saved.Phase
	if st.Phase == "" {
		st.Phase = "board"
	}
	if s.game.FinalRound == nil {
		st.Phase = "board"
	} else {
		st.FinalIndex = saved.FinalIndex
		if st.FinalIndex < 0 {
			st.FinalIndex = 0
		}
		if n := len(s.game.FinalRound.Questions); st.FinalIndex >= n {
			st.FinalIndex = n - 1
		}
		st.FinalRevealed = saved.FinalRevealed
		st.TimerEndsAt = saved.TimerEndsAt
		for _, p := range s.game.Players {
			if saved.FinalAwarded[p] {
				st.FinalAwarded[p] = true
			}
		}
	}
	return st
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("GET /api/config", s.handleConfig)
	s.mux.HandleFunc("GET /api/game", s.handleGame)
	s.mux.HandleFunc("GET /api/state", s.handleState)
	s.mux.HandleFunc("GET /api/ws", s.handleWS)
	s.mux.HandleFunc("POST /api/moderator/auth", s.handleAuth)
	s.mux.HandleFunc("POST /api/action", s.handleAction)

	// Serve game image assets from disk (final-round images, etc.) with
	// no-store headers so freshly-swapped images always show up.
	if s.assetsDir != "" {
		fileServer := http.FileServer(http.Dir(s.assetsDir))
		s.mux.Handle("GET /assets/", http.StripPrefix("/assets/", noCache(fileServer)))
	}

	// Serve the SPA for everything else. If no assets were embedded (dev mode),
	// this responds with a helpful hint instead of a blank 404.
	if s.assets != nil {
		s.mux.Handle("/", spaHandler(s.assets))
	} else {
		s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "frontend not built — run the Vite dev server, or build with `npm run build` in ./web", http.StatusServiceUnavailable)
		})
	}
}

// ServeHTTP makes Server an http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleGame(w http.ResponseWriter, r *http.Request) {
	// Never send the passkey to clients.
	g := *s.game
	g.Passkey = ""
	writeJSON(w, http.StatusOK, g)
}

// handleConfig tells the client whether the moderator view needs a passkey.
func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"passkeyRequired": s.game.Passkey != ""})
}

// handleAuth validates a submitted passkey (sent in the X-Meopardy-Passkey
// header). Used by the moderator login prompt.
func (s *Server) handleAuth(w http.ResponseWriter, r *http.Request) {
	if !s.checkPasskey(r) {
		http.Error(w, "invalid passkey", http.StatusUnauthorized)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// checkPasskey reports whether a request is allowed to drive the game. When no
// passkey is configured, everything is allowed.
func (s *Server) checkPasskey(r *http.Request) bool {
	if s.game.Passkey == "" {
		return true
	}
	return r.Header.Get("X-Meopardy-Passkey") == s.game.Passkey
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, toWire(s.hub.snapshot()))
}

// noCache wraps a handler so responses aren't cached — handy for game images
// that get swapped out while building a game.
func noCache(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		h.ServeHTTP(w, r)
	})
}

// handleWS streams live game state to a screen over a WebSocket. The server
// only ever pushes (screens send nothing), so we use CloseRead to let the
// library handle incoming control frames and signal disconnects.
func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		// LAN play reaches the server by IP and by <name>.local, so accept any
		// origin rather than fighting host/origin mismatches.
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return
	}
	defer c.CloseNow()

	ctx := c.CloseRead(r.Context())
	ch := s.hub.subscribe()
	defer s.hub.unsubscribe(ch)

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			if err := c.Write(ctx, websocket.MessageText, msg); err != nil {
				return
			}
		}
	}
}

// actionRequest is the moderator's command to change game state.
type actionRequest struct {
	Type     string `json:"type"`
	Category int    `json:"category"`
	Row      int    `json:"row"`
	Player   string `json:"player"`
}

// handleAction applies a moderator command and broadcasts the resulting state.
//
//   - open:   put a cell in play (highlight it on the big screen)
//   - reveal: show the open cell's question on the big screen
//   - hide:   hide the question again (cell stays in play)
//   - award:  give the open cell's points to a player and close the cell
//   - cancel: take the cell out of play without marking it answered
//   - close:  mark the open cell answered and clear it (no winner)
//   - undo:   revert the most recent action (repeatable)
//   - finale/hideFinale: show/hide the end-game score reveal on the big screen
//   - reset:  clear the whole board and zero all scores
func (s *Server) handleAction(w http.ResponseWriter, r *http.Request) {
	if !s.checkPasskey(r) {
		http.Error(w, "invalid passkey", http.StatusUnauthorized)
		return
	}
	var a actionRequest
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	switch a.Type {
	case "open":
		if !s.validCell(a.Category, a.Row) {
			http.Error(w, "invalid cell", http.StatusBadRequest)
			return
		}
		s.hub.mutate(func(st *GameState) {
			if st.Done[cellKey(a.Category, a.Row)] {
				return // don't reopen an answered cell
			}
			st.OpenCell = &CellRef{Category: a.Category, Row: a.Row}
			st.Revealed = false // a freshly opened cell starts hidden
		})
	case "reveal":
		s.hub.mutate(func(st *GameState) {
			if st.OpenCell != nil {
				st.Revealed = true
			}
		})
	case "hide":
		s.hub.mutate(func(st *GameState) { st.Revealed = false })
	case "award":
		if !s.playerKnown(a.Player) {
			http.Error(w, "unknown player", http.StatusBadRequest)
			return
		}
		s.hub.mutate(func(st *GameState) {
			if st.OpenCell == nil {
				return
			}
			cell := s.game.Categories[st.OpenCell.Category].Cells[st.OpenCell.Row]
			st.Scores[a.Player] += cell.Points
			st.Done[cellKey(st.OpenCell.Category, st.OpenCell.Row)] = true
			st.OpenCell = nil
			st.Revealed = false
		})
	case "undo":
		s.hub.undoLast()
	case "finale":
		s.hub.mutate(func(st *GameState) { st.ShowFinale = true })
	case "hideFinale":
		s.hub.mutate(func(st *GameState) { st.ShowFinale = false })
	case "startFinal":
		if s.game.FinalRound == nil {
			http.Error(w, "this game has no final round", http.StatusBadRequest)
			return
		}
		s.hub.mutate(func(st *GameState) {
			st.Phase = "final"
			st.FinalIndex = 0
			st.FinalRevealed = false
			st.FinalAwarded = map[string]bool{}
			st.TimerEndsAt = 0
			st.ShowFinale = false
			st.OpenCell = nil
			st.Revealed = false
		})
	case "showBoard":
		s.hub.mutate(func(st *GameState) {
			st.Phase = "board"
			st.TimerEndsAt = 0
			st.ShowFinale = false
		})
	case "finalReveal":
		s.hub.mutate(func(st *GameState) { st.FinalRevealed = true })
	case "finalHide":
		s.hub.mutate(func(st *GameState) { st.FinalRevealed = false })
	case "finalStartTimer":
		if s.game.FinalRound == nil {
			http.Error(w, "this game has no final round", http.StatusBadRequest)
			return
		}
		dur := int64(s.game.FinalRound.TimerSeconds) * 1000
		s.hub.mutate(func(st *GameState) { st.TimerEndsAt = nowMs() + dur })
	case "finalStopTimer":
		s.hub.mutate(func(st *GameState) { st.TimerEndsAt = 0 })
	case "finalToggle":
		if s.game.FinalRound == nil {
			http.Error(w, "this game has no final round", http.StatusBadRequest)
			return
		}
		if !s.playerKnown(a.Player) {
			http.Error(w, "unknown player", http.StatusBadRequest)
			return
		}
		pts := s.game.FinalRound.Points
		s.hub.mutate(func(st *GameState) {
			if st.FinalAwarded == nil {
				st.FinalAwarded = map[string]bool{}
			}
			if st.FinalAwarded[a.Player] {
				delete(st.FinalAwarded, a.Player)
				st.Scores[a.Player] -= pts
			} else {
				st.FinalAwarded[a.Player] = true
				st.Scores[a.Player] += pts
			}
		})
	case "finalNext":
		if s.game.FinalRound == nil {
			http.Error(w, "this game has no final round", http.StatusBadRequest)
			return
		}
		last := len(s.game.FinalRound.Questions) - 1
		s.hub.mutate(func(st *GameState) {
			if st.FinalIndex < last {
				st.FinalIndex++
			}
			st.FinalRevealed = false
			st.TimerEndsAt = 0
			st.FinalAwarded = map[string]bool{}
		})
	case "finalPrev":
		s.hub.mutate(func(st *GameState) {
			if st.FinalIndex > 0 {
				st.FinalIndex--
			}
			st.FinalRevealed = false
			st.TimerEndsAt = 0
			st.FinalAwarded = map[string]bool{}
		})
	case "cancel":
		s.hub.mutate(func(st *GameState) {
			st.OpenCell = nil
			st.Revealed = false
		})
	case "close":
		s.hub.mutate(func(st *GameState) {
			if st.OpenCell != nil {
				st.Done[cellKey(st.OpenCell.Category, st.OpenCell.Row)] = true
				st.OpenCell = nil
			}
			st.Revealed = false
		})
	case "reset":
		s.hub.mutate(func(st *GameState) {
			st.Done = map[string]bool{}
			st.OpenCell = nil
			st.Revealed = false
			st.ShowFinale = false
			st.Phase = "board"
			st.FinalIndex = 0
			st.FinalRevealed = false
			st.FinalAwarded = map[string]bool{}
			st.TimerEndsAt = 0
			for p := range st.Scores {
				st.Scores[p] = 0
			}
		})
	default:
		http.Error(w, "unknown action type", http.StatusBadRequest)
		return
	}

	// Return the wire format (with serverNow) so an optimistic client update
	// carries the server clock and the timer countdown stays correct.
	writeJSON(w, http.StatusOK, toWire(s.hub.snapshot()))
}

func (s *Server) validCell(category, row int) bool {
	if category < 0 || category >= len(s.game.Categories) {
		return false
	}
	return row >= 0 && row < len(s.game.Categories[category].Cells)
}

func (s *Server) playerKnown(name string) bool {
	for _, p := range s.game.Players {
		if p == name {
			return true
		}
	}
	return false
}

// cellKey builds the "category:row" key used in GameState.Done. It must match
// the client's cellKey (see web/src/types.ts).
func cellKey(category, row int) string {
	return fmt.Sprintf("%d:%d", category, row)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write json: %v", err)
	}
}

// spaHandler serves static files, falling back to index.html for client-side
// routes (e.g. /moderator) so browser refreshes don't 404.
func spaHandler(assets fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(assets))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path != "/" {
			if _, err := fs.Stat(assets, path[1:]); err != nil {
				r = r.Clone(r.Context())
				r.URL.Path = "/"
			}
		}
		fileServer.ServeHTTP(w, r)
	})
}

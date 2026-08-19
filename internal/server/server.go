// Package server wires up the Meopardy HTTP API and serves the built frontend.
//
// The server holds the authoritative game state. Screens read it by polling
// GET /api/state on a short interval (robust on smart-TV browsers), and the
// moderator drives the game with POST /api/action. The moderator passkey and
// disk persistence come in later phases.
package server

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"meopardy/internal/game"
)

// Server holds the dependencies shared across HTTP handlers.
type Server struct {
	game   *game.Game
	hub    *hub
	assets fs.FS
	mux    *http.ServeMux
}

// New builds a Server. assets is the built frontend filesystem (embedded in
// production, or nil during development when Vite serves the UI itself).
func New(g *game.Game, assets fs.FS) *Server {
	s := &Server{game: g, hub: newHub(), assets: assets, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("GET /api/game", s.handleGame)
	s.mux.HandleFunc("GET /api/state", s.handleState)
	s.mux.HandleFunc("POST /api/action", s.handleAction)

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
	writeJSON(w, http.StatusOK, s.game)
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.hub.snapshot())
}

// actionRequest is the moderator's command to change game state.
type actionRequest struct {
	Type     string `json:"type"`
	Category int    `json:"category"`
	Row      int    `json:"row"`
}

// handleAction applies a moderator command and broadcasts the resulting state.
//
//   - open:   reveal a cell (highlight it on the big screen)
//   - cancel: close the reveal without marking the cell answered
//   - close:  mark the open cell answered and clear it
//   - reset:  clear the whole board
func (s *Server) handleAction(w http.ResponseWriter, r *http.Request) {
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
		})
	case "cancel":
		s.hub.mutate(func(st *GameState) { st.OpenCell = nil })
	case "close":
		s.hub.mutate(func(st *GameState) {
			if st.OpenCell != nil {
				st.Done[cellKey(st.OpenCell.Category, st.OpenCell.Row)] = true
				st.OpenCell = nil
			}
		})
	case "reset":
		s.hub.mutate(func(st *GameState) {
			st.Done = map[string]bool{}
			st.OpenCell = nil
		})
	default:
		http.Error(w, "unknown action type", http.StatusBadRequest)
		return
	}

	writeJSON(w, http.StatusOK, s.hub.snapshot())
}

func (s *Server) validCell(category, row int) bool {
	if category < 0 || category >= len(s.game.Categories) {
		return false
	}
	return row >= 0 && row < len(s.game.Categories[category].Cells)
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

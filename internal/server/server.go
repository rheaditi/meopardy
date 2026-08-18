// Package server wires up the Meopardy HTTP API and serves the built frontend.
//
// In Phase 1 this exposes a single read-only endpoint (the loaded game board)
// and serves the embedded single-page app. Live sync (WebSocket), the moderator
// passkey, and game state come in later phases.
package server

import (
	"encoding/json"
	"io/fs"
	"log"
	"net/http"

	"meopardy/internal/game"
)

// Server holds the dependencies shared across HTTP handlers.
type Server struct {
	game   *game.Game
	assets fs.FS
	mux    *http.ServeMux
}

// New builds a Server. assets is the built frontend filesystem (embedded in
// production, or nil during development when Vite serves the UI itself).
func New(g *game.Game, assets fs.FS) *Server {
	s := &Server{game: g, assets: assets, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/game", s.handleGame)
	s.mux.HandleFunc("GET /api/health", s.handleHealth)

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
		// If the requested file exists, serve it; otherwise serve index.html.
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

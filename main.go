// Command meopardy runs the Meopardy game server: a Jeopardy-style trivia game
// meant to be played at home over a local network, with a moderator view and a
// shared big-screen public view.
package main

import (
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"os"

	"meopardy/internal/game"
	"meopardy/internal/server"
)

// distFS holds the built frontend. The web/dist directory always contains at
// least a placeholder index.html so this embed compiles before the first build.
//
//go:embed all:web/dist
var distFS embed.FS

func main() {
	addr := flag.String("addr", ":8080", "address to listen on")
	gamePath := flag.String("game", "games/sample.json", "path to the game JSON file")
	statePath := flag.String("state", "meopardy-state.json", "path to persist live game state (empty to disable)")
	assetsDir := flag.String("assets", "assets", "directory of game image assets, served at /assets/ (empty to disable)")
	dev := flag.Bool("dev", false, "dev mode: don't serve the embedded frontend (use the Vite dev server)")
	flag.Parse()

	g, err := game.Load(*gamePath)
	if err != nil {
		log.Fatalf("load game: %v", err)
	}
	log.Printf("loaded game %q with %d categories", g.Title, len(g.Categories))

	var assets fs.FS
	if !*dev {
		sub, err := fs.Sub(distFS, "web/dist")
		if err != nil {
			log.Fatalf("mount frontend: %v", err)
		}
		assets = sub
	}

	srv := server.New(g, assets, *statePath, *assetsDir)

	if host := os.Getenv("MEOPARDY_HOST"); host != "" {
		log.Printf("hint: on your network, players can reach the big screen at http://%s%s/", host, *addr)
	}
	log.Printf("Meopardy listening on %s (public view: /, moderator: /moderator)", *addr)
	if err := http.ListenAndServe(*addr, srv); err != nil {
		log.Fatalf("server: %v", err)
	}
}

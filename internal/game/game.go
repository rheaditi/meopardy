// Package game defines the Meopardy game data model and loads game
// definitions from JSON files on disk.
package game

import (
	"encoding/json"
	"fmt"
	"os"
)

// Cell is a single question on the board. The prompt/answer/hint are free-form
// text the moderator reads however they like — Meopardy does not enforce the
// classic Jeopardy "answer in the form of a question" framing.
type Cell struct {
	Points int    `json:"points"`
	Prompt string `json:"prompt"`
	Answer string `json:"answer"`
	Hint   string `json:"hint,omitempty"`
}

// Category is one column of the board.
type Category struct {
	Name string `json:"name"`
	// Description is optional moderator-only context, shown as a tooltip when
	// the moderator hovers the category so they can explain it if needed. It is
	// not displayed on the big screen.
	Description string `json:"description,omitempty"`
	Cells       []Cell `json:"cells"`
}

// Game is a full board definition loaded from a JSON file. This is the static
// starting state; live scores and which cells are answered live elsewhere.
type Game struct {
	Title string `json:"title"`
	// Passkey, if set, gates the moderator view. It lives only on the server —
	// it is stripped before the game is sent to any client.
	Passkey    string     `json:"passkey,omitempty"`
	Players    []string   `json:"players,omitempty"`
	Categories []Category `json:"categories"`
}

// Load reads and validates a game definition from the given JSON file path.
func Load(path string) (*Game, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read game file: %w", err)
	}
	g, err := Parse(data)
	if err != nil {
		return nil, fmt.Errorf("game file %q: %w", path, err)
	}
	return g, nil
}

// Parse unmarshals and validates a game definition from JSON bytes. It's the
// single source of truth for "will the server accept this game", shared by the
// server and the game linter.
func Parse(data []byte) (*Game, error) {
	var g Game
	if err := json.Unmarshal(data, &g); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	if err := g.validate(); err != nil {
		return nil, fmt.Errorf("invalid: %w", err)
	}
	return &g, nil
}

// validate checks that the board is well-formed enough to render and play.
func (g *Game) validate() error {
	if g.Title == "" {
		return fmt.Errorf("game title is required")
	}
	if len(g.Categories) == 0 {
		return fmt.Errorf("game needs at least one category")
	}
	seen := make(map[string]bool, len(g.Players))
	for i, p := range g.Players {
		if p == "" {
			return fmt.Errorf("player %d has an empty name", i+1)
		}
		if seen[p] {
			return fmt.Errorf("duplicate player name %q", p)
		}
		seen[p] = true
	}
	for i, c := range g.Categories {
		if c.Name == "" {
			return fmt.Errorf("category %d is missing a name", i+1)
		}
		if len(c.Cells) == 0 {
			return fmt.Errorf("category %q has no cells", c.Name)
		}
		for j, cell := range c.Cells {
			if cell.Prompt == "" {
				return fmt.Errorf("category %q cell %d is missing a prompt", c.Name, j+1)
			}
			if cell.Answer == "" {
				return fmt.Errorf("category %q cell %d is missing an answer", c.Name, j+1)
			}
		}
	}
	return nil
}

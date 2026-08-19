// Command lintgame checks that a Meopardy game JSON file will be accepted by
// the server, and fixes obvious mistakes in place: it strips trailing commas
// and reformats the file with standard indentation.
//
// Usage: lintgame <game.json> [more.json ...]
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"

	"meopardy/internal/game"
)

func main() {
	files := os.Args[1:]
	if len(files) == 0 {
		fmt.Fprintln(os.Stderr, "usage: lintgame <game.json> [more.json ...]")
		os.Exit(2)
	}
	failed := false
	for _, f := range files {
		if !lint(f) {
			failed = true
		}
	}
	if failed {
		os.Exit(1)
	}
}

func lint(path string) bool {
	raw, err := os.ReadFile(path)
	if err != nil {
		fmt.Printf("FAIL %s: %v\n", path, err)
		return false
	}

	cleaned := stripTrailingCommas(raw)

	// Reformat with standard 2-space indentation. json.Indent also rejects
	// anything that isn't valid JSON, so this is our syntax check.
	var pretty bytes.Buffer
	if err := json.Indent(&pretty, cleaned, "", "  "); err != nil {
		fmt.Printf("FAIL %s: not valid JSON (%v)\n", path, err)
		return false
	}
	// Normalize to exactly one trailing newline so repeated runs are a no-op.
	formatted := append(bytes.TrimRight(pretty.Bytes(), " \t\r\n"), '\n')

	changed := !bytes.Equal(formatted, raw)
	if changed {
		if err := os.WriteFile(path, formatted, 0o644); err != nil {
			fmt.Printf("FAIL %s: could not write fixes (%v)\n", path, err)
			return false
		}
	}

	// The real test: would the server accept it?
	g, err := game.Parse(cleaned)
	if err != nil {
		fmt.Printf("FAIL %s: the server would reject this — %v\n", path, err)
		return false
	}

	suffix := "already tidy"
	if changed {
		suffix = "fixed formatting"
	}
	fmt.Printf("OK   %s: valid (%d categories, %d players) — %s\n",
		path, len(g.Categories), len(g.Players), suffix)
	return true
}

// stripTrailingCommas removes commas that directly precede a closing } or ]
// (ignoring whitespace), which standard JSON forbids but people often leave in.
// It is string-aware, so commas inside string values are never touched.
func stripTrailingCommas(src []byte) []byte {
	out := make([]byte, 0, len(src))
	inString := false
	escaped := false
	for i := 0; i < len(src); i++ {
		c := src[i]
		if inString {
			out = append(out, c)
			switch {
			case escaped:
				escaped = false
			case c == '\\':
				escaped = true
			case c == '"':
				inString = false
			}
			continue
		}
		if c == '"' {
			inString = true
			out = append(out, c)
			continue
		}
		if c == ',' {
			j := i + 1
			for j < len(src) && (src[j] == ' ' || src[j] == '\t' || src[j] == '\n' || src[j] == '\r') {
				j++
			}
			if j < len(src) && (src[j] == '}' || src[j] == ']') {
				continue // drop this trailing comma
			}
		}
		out = append(out, c)
	}
	return out
}

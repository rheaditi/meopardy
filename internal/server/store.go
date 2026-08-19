package server

import (
	"encoding/json"
	"os"
	"sync"
)

// stateStore persists the live game state to a JSON file. Writes are atomic
// (temp file + rename) and serialized, so a crash mid-write can't corrupt the
// saved state. It is safe for concurrent use.
type stateStore struct {
	path string
	mu   sync.Mutex
}

// load reads the saved state. The bool is false when there's no readable/valid
// saved state (first run, missing or corrupt file) — the caller then starts
// fresh rather than failing.
func (s *stateStore) load() (GameState, bool) {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return GameState{}, false
	}
	var gs GameState
	if err := json.Unmarshal(data, &gs); err != nil {
		return GameState{}, false
	}
	return gs, true
}

func (s *stateStore) save(gs GameState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := json.MarshalIndent(gs, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

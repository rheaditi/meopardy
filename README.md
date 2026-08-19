# Meopardy

A Jeopardy-style trivia game for playing at home with friends over a local
network. Inspired by the "Beopardy" bit from Smosh Games.

Two surfaces:

- **Big screen** (`/`) — a read-only board on a TV or projector that everyone
  looks at.
- **Moderator** (`/moderator`) — the control surface (e.g. an iPad). The
  moderator opens cells, reads the prompt, sees the answer + hint (which the big
  screen never shows), and awards points.

Players buzz in offline (a bell, a shout, hands up) — the moderator just picks
who won or lost each cell.

The two screens stay in sync: game state lives on the server, shared across
every screen, so opening or closing a cell on the moderator shows up on the big
screen with no reload. Each screen chooses how it receives updates, via a toggle
in the top bar (or a `?transport=ws|poll` URL param):

- **Polling** (default) — GET `/api/state` about once a second. The robust
  choice on smart-TV browsers, which can mishandle long-lived connections.
- **WebSocket** — instant server push over `/api/ws`. Snappier where the
  browser is known-good.

The server pushes over the WebSocket only to screens that are actually
connected; screens that poll just pull. No client connected means no work.

## Run it

You need [Go](https://go.dev) 1.26+ and [Node](https://nodejs.org) 18+.

```bash
make run
```

Then open:

- Big screen: <http://localhost:8080>
- Moderator: <http://localhost:8080/moderator>

To let others join over your local network, share your machine's LAN address,
e.g. `http://192.168.1.42:8080`.

`make run` builds the frontend, embeds it into a single Go binary, and starts
the server. The resulting `./meopardy` binary is fully self-contained — copy it
(plus a `games/` folder) to any machine and run it, no Node or Go required.

### Choosing a game

`make run` plays `games/sample.json` by default. Pick another with `GAME` (and
optionally `ADDR`):

```bash
make run GAME=games/trick-questions.json

# on a specific port, so others can join at http://<your-ip>:9000
make run GAME=games/trick-questions.json ADDR=:9000
```

Or run the already-built binary directly:

```bash
./meopardy -game games/trick-questions.json -addr :9000
```

During development, `go run` takes the same flags:

```bash
go run . -game games/trick-questions.json
```

Live progress (scores, answered cells) is saved to `meopardy-state.json` and
resumed automatically on the next start, so a restart won't lose an in-progress
game. Use `-state path.json` to change the file, or `-state ""` to disable it.
Deleting the file (or hitting Reset in the moderator) starts fresh.

### Writing a game

Copy [`games/trick-questions.json`](games/trick-questions.json) — a template of
placeholders — and fill it in. Before playing, check it will load and tidy up
formatting (fixes trailing commas + indentation in place):

```bash
make lint-game GAME=games/trick-questions.json
```

Pass a glob to lint several at once: `make lint-game GAME='games/*.json'`.

## Development

Two terminals for hot-reload:

```bash
go run . -dev          # API on :8080, no embedded UI
cd web && npm run dev  # Vite UI on :5173, proxies /api to :8080
```

Open <http://localhost:5173>.

## Tests

End-to-end only (Playwright) — they drive the real single-binary server in a
headless browser. There are no unit tests.

```bash
cd web && npx playwright install chromium   # once
make test
```

The tests run the server against a dedicated fixture
([`web/e2e/fixtures/game.json`](web/e2e/fixtures/game.json)) rather than the
real `games/` files, so editing a game never breaks the suite.

## Game files

A game is a JSON file describing the board. Columns are categories; each cell
has points and free-form prompt/answer/hint text (read however you like — the
classic "answer in the form of a question" framing is optional). See
[`games/sample.json`](games/sample.json).

```json
{
  "title": "Friday Night Meopardy",
  "players": ["Alex", "Sam", "Jo"],
  "categories": [
    {
      "name": "History",
      "cells": [
        { "points": 100, "prompt": "This wall fell in 1989...", "answer": "The Berlin Wall", "hint": "Germany" }
      ]
    }
  ]
}
```

`players` is optional — list the people playing and their names appear on the
moderator for awarding points and scorekeeping.

Add an optional `"passkey": "your-secret"` to require it on the moderator view
(`/moderator` shows a prompt; players on the big screen aren't affected). It's a
light gate for casual play, not real security, and it's kept server-side —
never sent to any client.

## Roadmap

- [x] **Phase 1 — Skeleton**: Go server, Vite/React UI, JSON loader, board in
      both views, dark mode.
- [x] **Phase 2 — Live sync**: server-authoritative game state shared across
      screens (open/close a cell, reset the board), with a switchable transport —
      polling (default, TV-safe) or WebSocket (instant) — chosen per screen.
- [x] **Reveal question**: the moderator opens a cell (seeing the answer/hint),
      reads it aloud, then reveals the question full-screen on the big screen for
      players — the answer never leaves the moderator's device.
- [x] **Scoring**: players come from the game JSON (`"players": [...]`); the
      moderator awards a cell's points to one player (or closes with no winner),
      with a repeatable undo. Scores show on the moderator. (Kept simple — no
      deduct-on-wrong mode.)
- [x] **Persistence**: live state (scores, answered cells, open/revealed) is
      saved to a JSON file (`-state`, default `meopardy-state.json`) on every
      change and resumed on startup, so a restart or crash mid-game doesn't lose
      the (hidden) scores.
- ~~Players + scores on the big screen~~ — intentionally skipped: scores stay on
  the moderator so the standings are a surprise.
- [x] **Moderator passkey**: an optional `"passkey"` in the game JSON gates the
      moderator view (login prompt) and is enforced on the server for all
      game-changing actions. The passkey is stripped before the game is sent to
      any client.
- [x] **Winner-reveal finale**: scores stay hidden on the big screen all game;
      the moderator triggers a full-screen reveal of the final standings, top
      scorer highlighted.
- [ ] **TV-hardening**: older LG/smart-TV browser support (build target,
      aspect-ratio fallback, QR-code join).
- [ ] **Polish**: sounds, animations, game editing.

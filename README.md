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

The two screens stay in sync: game state lives on the server, and every screen
polls it about once a second, so opening or closing a cell on the moderator
shows up on the big screen a moment later, with no reload. Polling (rather than
a persistent connection) is deliberate — it's the robust choice on smart-TV
browsers, which often buffer or drop long-lived connections.

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

```bash
./meopardy -game games/sample.json -addr :8080
```

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

## Game files

A game is a JSON file describing the board. Columns are categories; each cell
has points and free-form prompt/answer/hint text (read however you like — the
classic "answer in the form of a question" framing is optional). See
[`games/sample.json`](games/sample.json).

```json
{
  "title": "Friday Night Meopardy",
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

## Roadmap

- [x] **Phase 1 — Skeleton**: Go server, Vite/React UI, JSON loader, board in
      both views, dark mode.
- [x] **Phase 2 — Live sync**: server-authoritative game state that every screen
      polls (~1.5s), so the big screen mirrors the moderator (open/close a cell,
      reset the board). Polling chosen over a persistent connection for smart-TV
      browser robustness.
- [ ] **Phase 2.5 — Moderator passkey**: gate the `/moderator` view behind a
      shared passkey.
- [ ] **Phase 3 — Game loop**: reveal prompt on the big screen, award/deduct per
      player, commit + undo, live scoreboard.
- [ ] **Phase 4 — Setup + persistence**: start screen (pick game, add players,
      choose scoring mode), auto-save state to disk, resume after a crash.
- [ ] **Phase 5 — Polish**: reset/undo history, final scoreboard, sounds,
      animations, game editing.

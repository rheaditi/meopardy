import { useEffect, useState } from "react";
import type { Game } from "./types";
import { fetchGame } from "./api";
import { useTheme } from "./useTheme";
import { useTransport } from "./useTransport";
import { PublicView } from "./views/PublicView";
import { ModeratorView } from "./views/ModeratorView";

// Simple path-based routing: /moderator is the control surface, anything else
// is the public big-screen board. Avoids pulling in a router dependency.
function isModerator(): boolean {
  return window.location.pathname.replace(/\/+$/, "") === "/moderator";
}

export function App() {
  const [theme, toggleTheme] = useTheme();
  const [transport, toggleTransport] = useTransport();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const moderator = isModerator();

  useEffect(() => {
    fetchGame().then(setGame).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="app">
      {/* The big screen has no top bar (TVs clip it via overscan); it floats
          its own controls. The moderator keeps the top bar. */}
      {moderator && (
        <header className="topbar">
          <div>
            <h1>{game?.title ?? "Meopardy"}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="role">Moderator</span>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {theme === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
          </div>
        </header>
      )}

      {error && <div className="center-msg error">Couldn't load the game: {error}</div>}
      {!error && !game && <div className="center-msg">Loading the board…</div>}
      {!error &&
        game &&
        (moderator ? (
          // The moderator is a reliable device and self-drives, so it always
          // uses WebSocket; the switchable transport lives on the big screen.
          <ModeratorView game={game} transport="ws" />
        ) : (
          <PublicView
            game={game}
            transport={transport}
            theme={theme}
            onToggleTransport={toggleTransport}
            onToggleTheme={toggleTheme}
          />
        ))}
    </div>
  );
}

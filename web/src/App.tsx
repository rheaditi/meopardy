import { useEffect, useState } from "react";
import type { Game } from "./types";
import { fetchGame } from "./api";
import { useTheme } from "./useTheme";
import { PublicView } from "./views/PublicView";
import { ModeratorView } from "./views/ModeratorView";

// Simple path-based routing: /moderator is the control surface, anything else
// is the public big-screen board. Avoids pulling in a router dependency.
function isModerator(): boolean {
  return window.location.pathname.replace(/\/+$/, "") === "/moderator";
}

export function App() {
  const [theme, toggleTheme] = useTheme();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const moderator = isModerator();

  useEffect(() => {
    fetchGame().then(setGame).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>{game?.title ?? "Meopardy"}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="role">{moderator ? "Moderator" : "Big screen"}</span>
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

      {error && <div className="center-msg error">Couldn't load the game: {error}</div>}
      {!error && !game && <div className="center-msg">Loading the board…</div>}
      {!error && game && (moderator ? <ModeratorView game={game} /> : <PublicView game={game} />)}
    </div>
  );
}

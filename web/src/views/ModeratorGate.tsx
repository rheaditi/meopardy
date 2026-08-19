import { useEffect, useState } from "react";
import type { Game } from "../types";
import { authenticate, fetchConfig, getPasskey } from "../api";
import { ModeratorView } from "./ModeratorView";

interface ModeratorGateProps {
  game: Game;
}

type Status = "checking" | "prompt" | "ok";

// ModeratorGate protects the moderator view behind the game's passkey. If the
// game has no passkey it lets the moderator straight in. Otherwise it validates
// a stored passkey, or shows a prompt.
export function ModeratorGate({ game }: ModeratorGateProps) {
  const [status, setStatus] = useState<Status>("checking");
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { passkeyRequired } = await fetchConfig();
        if (!active) return;
        if (!passkeyRequired) {
          setStatus("ok");
          return;
        }
        // Try a previously-stored passkey.
        const saved = getPasskey();
        if (saved && (await authenticate(saved))) {
          if (active) setStatus("ok");
        } else if (active) {
          setStatus("prompt");
        }
      } catch {
        if (active) setStatus("prompt");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry.trim()) {
      setError("Enter the passkey");
      return;
    }
    if (await authenticate(entry.trim())) {
      setStatus("ok");
    } else {
      setError("That passkey didn't work");
    }
  }

  if (status === "ok") {
    // The moderator is a reliable device and self-drives, so it uses WebSocket.
    return <ModeratorView game={game} transport="ws" />;
  }

  if (status === "checking") {
    return <div className="center-msg">Checking access…</div>;
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <h2 className="gate-title">Moderator access</h2>
        <p className="gate-sub">This game is passkey-protected.</p>
        <input
          type="password"
          className="gate-input"
          placeholder="Passkey"
          value={entry}
          autoFocus
          onChange={(e) => {
            setEntry(e.target.value);
            if (error) setError(null);
          }}
        />
        {error && <div className="gate-error">{error}</div>}
        <button type="submit" className="btn primary">
          Enter
        </button>
      </form>
    </div>
  );
}

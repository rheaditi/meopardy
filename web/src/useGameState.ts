import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "./types";

// How often screens poll the server for the latest state. A short poll (rather
// than a long-lived stream) is deliberately chosen for robustness on smart-TV
// browsers, which often buffer or silently drop persistent connections.
const POLL_MS = 1500;

// useGameState polls the server's game state on an interval and returns it,
// along with an `apply` function to update it optimistically.
//
// The big screen just reads `state` (a ~1.5s lag is invisible there). The
// moderator, who is actively driving, calls `apply` with the state returned by
// an action so their own screen updates instantly instead of waiting for the
// next poll; the poll then reconciles in the background.
export function useGameState(): { state: GameState | null; apply: (s: GameState) => void } {
  const [state, setState] = useState<GameState | null>(null);
  // Bumped on every optimistic apply so an in-flight poll that started earlier
  // can't clobber a just-applied state with a stale response.
  const genRef = useRef(0);

  const apply = useCallback((s: GameState) => {
    genRef.current++;
    setState(s);
  }, []);

  useEffect(() => {
    let active = true;
    let inFlight = false;

    async function poll() {
      if (inFlight) return; // don't stack requests on a slow network
      inFlight = true;
      const gen = genRef.current;
      try {
        const res = await fetch("/api/state");
        if (res.ok) {
          const next = (await res.json()) as GameState;
          if (active && genRef.current === gen) setState(next);
        }
      } catch {
        // keep the last known state; try again next tick
      } finally {
        inFlight = false;
      }
    }

    poll(); // fetch immediately so the board isn't blank while we wait
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return { state, apply };
}

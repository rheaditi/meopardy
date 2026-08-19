import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "./types";
import type { Transport } from "./useTransport";

// Poll interval for the "poll" transport.
const POLL_MS = 900;
// Delay before reconnecting a dropped WebSocket (it won't reconnect itself).
const RECONNECT_MS = 1000;

// useGameState delivers the server's live game state using the chosen transport,
// and returns an `apply` function for optimistic updates.
//
// - "ws":   connect to /api/ws and receive pushes (instant); auto-reconnects.
// - "poll": GET /api/state every ~0.9s (robust on smart-TV browsers).
//
// The moderator calls `apply` with the state an action returns so their own
// screen updates immediately; the transport then delivers the authoritative
// state. A generation counter stops a stale in-flight poll from clobbering a
// just-applied state.
export function useGameState(transport: Transport): {
  state: GameState | null;
  apply: (s: GameState) => void;
} {
  const [state, setState] = useState<GameState | null>(null);
  const genRef = useRef(0);

  const apply = useCallback((s: GameState) => {
    genRef.current++;
    setState(s);
  }, []);

  useEffect(() => {
    let active = true;

    if (transport === "ws") {
      let ws: WebSocket | null = null;
      let retry: ReturnType<typeof setTimeout> | undefined;

      const connect = () => {
        if (!active) return;
        const proto = location.protocol === "https:" ? "wss" : "ws";
        ws = new WebSocket(`${proto}://${location.host}/api/ws`);
        ws.onmessage = (e) => {
          if (!active) return;
          try {
            setState(JSON.parse(e.data) as GameState);
          } catch {
            // ignore malformed frames
          }
        };
        ws.onclose = () => {
          if (active) retry = setTimeout(connect, RECONNECT_MS);
        };
        ws.onerror = () => ws?.close();
      };

      connect();
      return () => {
        active = false;
        if (retry) clearTimeout(retry);
        ws?.close();
      };
    }

    // transport === "poll"
    let inFlight = false;
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      const gen = genRef.current;
      try {
        const res = await fetch("/api/state");
        if (res.ok) {
          const next = (await res.json()) as GameState;
          if (active && genRef.current === gen) setState(next);
        }
      } catch {
        // keep the last known state; retry next tick
      } finally {
        inFlight = false;
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [transport]);

  return { state, apply };
}

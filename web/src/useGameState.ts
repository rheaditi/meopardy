import { useCallback, useEffect, useState } from "react";
import type { GameState } from "./types";

// How long to wait before reconnecting after the socket drops. Unlike
// EventSource, a raw WebSocket does not reconnect itself, so we do it.
const RECONNECT_MS = 1000;

// useGameState subscribes to the server's live game state over a WebSocket
// (GET /api/ws) and returns it, plus an `apply` function for optimistic updates.
//
// The big screen just reads `state`. The moderator, who is actively driving,
// calls `apply` with the state an action returns so their own screen updates
// immediately; the socket then delivers the authoritative state right after.
export function useGameState(): { state: GameState | null; apply: (s: GameState) => void } {
  const [state, setState] = useState<GameState | null>(null);
  const apply = useCallback((s: GameState) => setState(s), []);

  useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    function connect() {
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
    }

    connect();
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, []);

  return { state, apply };
}

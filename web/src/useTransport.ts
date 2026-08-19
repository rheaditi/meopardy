import { useEffect, useState } from "react";

// How a screen receives live state: a WebSocket push, or short HTTP polling.
export type Transport = "ws" | "poll";

const STORAGE_KEY = "meopardy-transport";

function initialTransport(): Transport {
  // A ?transport=ws|poll query param wins — handy for bookmarking a mode on a
  // TV without needing to click a toggle with the remote.
  const q = new URLSearchParams(window.location.search).get("transport");
  if (q === "ws" || q === "poll") return q;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "ws" || saved === "poll") return saved;

  // Default to polling: it's the robust choice on smart-TV browsers, which can
  // mishandle long-lived sockets. Flip to WebSocket for instant updates where
  // the browser is known-good.
  return "poll";
}

// useTransport keeps the chosen transport in sync with localStorage so a screen
// remembers its mode across reloads.
export function useTransport(): [Transport, () => void] {
  const [transport, setTransport] = useState<Transport>(initialTransport);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, transport);
  }, [transport]);

  const toggle = () => setTransport((t) => (t === "ws" ? "poll" : "ws"));
  return [transport, toggle];
}

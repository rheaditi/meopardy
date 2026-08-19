import { useEffect, useState } from "react";

// useCountdown returns the whole seconds remaining until endsAt (server unix
// ms), or null when there's no timer. It anchors to the server's clock via
// serverNow (so it's unaffected by client clock skew) and then ticks locally.
export function useCountdown(endsAt: number, serverNow: number): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt || endsAt <= 0) {
      setRemaining(null);
      return;
    }
    // Remaining at the instant this state was produced, using server clocks
    // only, so no dependency on the client's clock.
    const remAtReceiptMs = endsAt - serverNow;
    const localStart = performance.now();

    const tick = () => {
      const elapsed = performance.now() - localStart;
      setRemaining(Math.max(0, Math.ceil((remAtReceiptMs - elapsed) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt, serverNow]);

  return remaining;
}

// formatClock renders seconds as m:ss.
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

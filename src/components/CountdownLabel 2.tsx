\"use client\";

import { useEffect, useState } from \"react\";

function getNextMidnightUtcMs(now: Date): number {
  // next midnight in UTC
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
}

export function CountdownLabel() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const midnightUtcMs = getNextMidnightUtcMs(now);
  const diffMs = Math.max(0, midnightUtcMs - now.getTime());

  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  const s = Math.floor((diffMs % 60_000) / 1_000);

  return (
    <>
      {h}:{String(m).padStart(2, \"0\")}:{String(s).padStart(2, \"0\")}
    </>
  );
}


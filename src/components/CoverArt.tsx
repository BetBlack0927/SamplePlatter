/**
 * CoverArt — generates a unique abstract SVG artwork per seed string.
 * Deterministic: same seed always produces the same cover.
 * No external dependencies. Scales cleanly at any size.
 */

interface CoverArtProps {
  /** Unique identifier — sample ID, date string, username, etc. */
  seed: string;
  className?: string;
}

export function CoverArt({ seed, className = "" }: CoverArtProps) {
  const h = Math.abs(hashCode(seed));
  const render = RENDERS[h % RENDERS.length];
  // Sanitize seed for use as an SVG gradient ID
  const gid = `cg-${seed.replace(/[^a-z0-9]/gi, "").slice(0, 20) || "x"}`;

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full block ${className}`}
      aria-hidden="true"
    >
      {render(gid)}
    </svg>
  );
}

/* ─── Render functions (one per palette/pattern combo) ────────── */

type RenderFn = (id: string) => React.ReactNode;

const RENDERS: RenderFn[] = [
  /* 0 · Amber Vinyl — warm amber glow, vinyl grooves */
  (id) => (
    <>
      <defs>
        <radialGradient id={id} cx="38%" cy="62%" r="65%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3a1a06" />
          <stop offset="45%" stopColor="#0f0804" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {[44, 37, 30, 23, 16, 10].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth="0.25" opacity="0.09" />
      ))}
      <circle cx="50" cy="50" r="4" fill="white" opacity="0.13" />
      <circle cx="50" cy="50" r="1.8" fill="#0a0804" />
      <line x1="20" y1="20" x2="80" y2="80" stroke="white" strokeWidth="0.2" opacity="0.04" />
    </>
  ),

  /* 1 · Arctic Teal — cold horizontal scan lines */
  (id) => (
    <>
      <defs>
        <radialGradient id={id} cx="70%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0a2525" />
          <stop offset="50%" stopColor="#061414" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {Array.from({ length: 18 }, (_, i) => (
        <line key={i} x1="0" y1={8 + i * 5} x2="100" y2={8 + i * 5} stroke="white" strokeWidth="0.2" opacity={i % 3 === 0 ? 0.1 : 0.05} />
      ))}
      <circle cx="70" cy="30" r="28" fill="none" stroke="white" strokeWidth="0.3" opacity="0.07" />
    </>
  ),

  /* 2 · Deep Indigo — radial purple, concentric squares */
  (id) => (
    <>
      <defs>
        <radialGradient id={id} cx="45%" cy="55%" r="60%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e0f40" />
          <stop offset="55%" stopColor="#0d0820" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {[40, 30, 20, 12].map((s) => (
        <rect key={s} x={50 - s} y={50 - s} width={s * 2} height={s * 2}
          fill="none" stroke="white" strokeWidth="0.25" opacity="0.08"
          transform="rotate(45 50 50)"
        />
      ))}
      <circle cx="45" cy="55" r="5" fill="white" opacity="0.06" />
    </>
  ),

  /* 3 · Burgundy Dub — deep red, diagonal slash bands */
  (id) => (
    <>
      <defs>
        <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#200510" />
          <stop offset="50%" stopColor="#0e0408" />
          <stop offset="100%" stopColor="#080808" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {[-20, -5, 10, 25, 40, 55, 70, 85, 100, 115].map((x) => (
        <line key={x} x1={x} y1="0" x2={x + 30} y2="100"
          stroke="white" strokeWidth="1.5" opacity="0.04" />
      ))}
      <circle cx="72" cy="28" r="18" fill="none" stroke="white" strokeWidth="0.3" opacity="0.08" />
      <circle cx="72" cy="28" r="10" fill="none" stroke="white" strokeWidth="0.2" opacity="0.06" />
    </>
  ),

  /* 4 · Forest Tape — dark green, cassette-style parallel lines */
  (id) => (
    <>
      <defs>
        <radialGradient id={id} cx="50%" cy="80%" r="60%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0c2214" />
          <stop offset="55%" stopColor="#06100a" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="0" y={i * 9 + 2} width="100" height="3"
          fill="white" opacity={i % 2 === 0 ? 0.04 : 0.025} />
      ))}
      <circle cx="30" cy="65" r="12" fill="none" stroke="white" strokeWidth="0.25" opacity="0.1" />
      <circle cx="70" cy="65" r="12" fill="none" stroke="white" strokeWidth="0.25" opacity="0.1" />
      <line x1="42" y1="65" x2="58" y2="65" stroke="white" strokeWidth="0.3" opacity="0.08" />
    </>
  ),

  /* 5 · Steel Cut — blue-gray, angular ray burst from corner */
  (id) => (
    <>
      <defs>
        <radialGradient id={id} cx="15%" cy="15%" r="80%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f1e2e" />
          <stop offset="55%" stopColor="#080e16" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * 60 - 10;
        const rad = (angle * Math.PI) / 180;
        return (
          <line key={i}
            x1="0" y1="0"
            x2={Math.cos(rad) * 140}
            y2={Math.sin(rad) * 140}
            stroke="white" strokeWidth="0.4"
            opacity={i % 2 === 0 ? 0.06 : 0.03}
          />
        );
      })}
      <circle cx="15" cy="15" r="8" fill="white" opacity="0.05" />
    </>
  ),

  /* 6 · Copper Press — warm copper, vinyl record with label */
  (id) => (
    <>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="55%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#231008" />
          <stop offset="40%" stopColor="#0e0705" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {[46, 40, 34, 28, 22, 17, 12].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth="0.2" opacity="0.07" />
      ))}
      <circle cx="50" cy="50" r="10" fill="#1a0c07" opacity="0.8" />
      <circle cx="50" cy="50" r="10" fill="none" stroke="white" strokeWidth="0.3" opacity="0.12" />
      <circle cx="50" cy="50" r="2.5" fill="white" opacity="0.15" />
      <circle cx="50" cy="50" r="1.2" fill="#080808" />
    </>
  ),

  /* 7 · Void Violet — deep violet, scattered ring constellations */
  (id) => (
    <>
      <defs>
        <radialGradient id={id} cx="60%" cy="40%" r="65%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1c0d38" />
          <stop offset="50%" stopColor="#0c061e" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {[
        { cx: 25, cy: 30, r: 14 },
        { cx: 70, cy: 55, r: 22 },
        { cx: 40, cy: 75, r: 10 },
      ].map(({ cx, cy, r }) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r}
          fill="none" stroke="white" strokeWidth="0.25" opacity="0.08" />
      ))}
      {[
        [18, 22], [32, 18], [65, 30], [75, 62], [44, 80], [55, 72],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" fill="white" opacity="0.25" />
      ))}
    </>
  ),
];

/* ─── Hash function ────────────────────────────────────────────── */

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

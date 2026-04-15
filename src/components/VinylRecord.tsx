"use client";

import { useId } from "react";

interface VinylRecordProps {
  isPlaying: boolean;
  onToggle: () => void;
  className?: string;
}

export function VinylRecord({
  isPlaying,
  onToggle,
  className = "",
}: VinylRecordProps) {
  const id = useId().replace(/:/g, "");
  const vinylSurfaceId = `${id}-vinyl-surface`;
  const labelSurfaceId = `${id}-label-surface`;
  const specularId = `${id}-specular`;

  return (
    <div className={`relative flex justify-center px-2 sm:px-4 ${className}`}>
      <div className="absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-full bg-white/[0.02] blur-[72px] sm:inset-x-16 sm:h-32" />
      <div className="absolute inset-[7%] rounded-full border border-white/[0.045] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.025),rgba(255,255,255,0.008)_52%,rgba(0,0,0,0.18)_72%,rgba(0,0,0,0.52)_100%)] shadow-[0_28px_72px_rgba(0,0,0,0.66)]" />
      <div className="absolute inset-[10.5%] rounded-full border border-white/[0.05] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.016),rgba(0,0,0,0.06)_62%,rgba(0,0,0,0.16)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]" />
      <div className="absolute bottom-3 h-9 w-[68%] rounded-full bg-black/72 blur-[24px] sm:bottom-4 sm:h-10" />

      <button
        type="button"
        onClick={onToggle}
        className="group relative w-full max-w-[21.75rem] sm:max-w-[25rem] md:max-w-[27rem] aspect-square"
        aria-label={isPlaying ? "Pause sample" : "Play sample"}
      >
        <div className="pointer-events-none absolute right-[6%] top-[8%] z-10 h-[34%] w-[34%] opacity-78">
          <div className="absolute right-[6%] top-[0%] h-4.5 w-4.5 rounded-full border border-white/[0.14] bg-[#181818] shadow-[0_0_0_4px_rgba(0,0,0,0.5)]" />
          <div className="absolute right-[10%] top-[12%] h-[2px] w-[68%] origin-right rotate-[149deg] bg-[linear-gradient(90deg,rgba(220,220,220,0.44),rgba(150,150,150,0.22)_55%,rgba(255,255,255,0.06)_100%)] shadow-[0_0_8px_rgba(255,255,255,0.025)]" />
          <div className="absolute right-[61.5%] top-[67%] h-[17%] w-[2px] origin-top rotate-[20deg] bg-[linear-gradient(180deg,rgba(228,228,228,0.42),rgba(120,120,120,0.12))]" />
          <div className="absolute right-[58.5%] top-[80%] h-[7px] w-[7px] rounded-full border border-white/[0.07] bg-[#d0d0d0]/24" />
        </div>

        <div className="absolute inset-[3.5%] rounded-full border border-white/[0.055] bg-[radial-gradient(circle_at_38%_31%,rgba(255,255,255,0.1),rgba(255,255,255,0.018)_24%,rgba(255,255,255,0)_42%),radial-gradient(circle_at_50%_50%,#181818_0%,#0c0c0c_64%,#040404_100%)] shadow-[inset_0_2px_12px_rgba(255,255,255,0.045),inset_0_-28px_40px_rgba(0,0,0,0.64)]" />

        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="turntable-record absolute inset-[7.5%] h-[85%] w-[85%]"
          data-playing={isPlaying}
        >
          <defs>
            <radialGradient id={vinylSurfaceId} cx="34%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#303030" />
              <stop offset="24%" stopColor="#1d1d1d" />
              <stop offset="58%" stopColor="#0c0c0c" />
              <stop offset="100%" stopColor="#020202" />
            </radialGradient>
            <radialGradient id={labelSurfaceId} cx="34%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2d2d2d" />
              <stop offset="55%" stopColor="#1d1d1d" />
              <stop offset="100%" stopColor="#141414" />
            </radialGradient>
            <radialGradient id={specularId} cx="36%" cy="32%" r="58%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="42%" stopColor="#ffffff" stopOpacity="0.038" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="50" cy="50" r="49.1" fill="#050505" />
          <circle cx="50" cy="50" r="47.5" fill={`url(#${vinylSurfaceId})`} />
          <circle cx="50" cy="50" r="47.1" fill="none" stroke="rgba(255,255,255,0.092)" strokeWidth="0.42" />
          <circle cx="50" cy="50" r="46.2" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.22" />

          {[
            42.5, 39.8, 37.2, 34.6, 32.1, 29.7, 27.4, 25.2, 23.1, 21.1, 19.2, 17.4,
            15.7, 14.1,
          ].map((r, i) => (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={i % 3 === 0 ? "rgba(255,255,255,0.078)" : "rgba(255,255,255,0.048)"}
              strokeWidth={i % 2 === 0 ? "0.24" : "0.18"}
            />
          ))}

          <path
            d="M18 46.5a32 32 0 0 0 64 0"
            fill="none"
            stroke="rgba(255,255,255,0.052)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <ellipse cx="40" cy="33" rx="22" ry="13" fill={`url(#${specularId})`} opacity="0.62" />

          <circle cx="50" cy="50" r="16.6" fill={`url(#${labelSurfaceId})`} />
          <circle cx="50" cy="50" r="15.8" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="0.34" />
          <circle cx="50" cy="50" r="10.8" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.24" />
          <circle cx="50" cy="50" r="1.35" fill="#0a0a0a" />
          <circle cx="50" cy="50" r="0.68" fill="#d8d8d8" opacity="0.85" />
        </svg>

        <div className="absolute inset-0 rounded-full ring-1 ring-white/[0.03] transition-opacity duration-500 group-hover:opacity-100 opacity-70" />
      </button>
    </div>
  );
}

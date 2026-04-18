"use client";

type BattleCharacterReaction =
  | "idle"
  | "lean-left"
  | "lean-right"
  | "slam-left"
  | "slam-right";

export function BattleCharacter({
  reaction = "idle",
}: {
  reaction?: BattleCharacterReaction;
}) {
  return (
    <div
      className="battle-character relative mx-auto flex h-28 w-20 items-end justify-center sm:h-32 sm:w-24"
      data-reaction={reaction}
      aria-hidden="true"
    >
      <div className="battle-character__glow absolute inset-x-1 bottom-2 h-5 rounded-full" />
      <div className="battle-character__impact battle-character__impact--left absolute left-[-1rem] top-8 h-10 w-10 rounded-full" />
      <div className="battle-character__impact battle-character__impact--right absolute right-[-1rem] top-8 h-10 w-10 rounded-full" />

      <div className="relative h-18 w-16 sm:h-20 sm:w-[4.5rem]">
        <div className="battle-character__head absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 rounded-full sm:h-7 sm:w-7" />
        <div className="battle-character__torso absolute left-1/2 top-6 h-12 w-8 -translate-x-1/2 rounded-[999px] sm:top-7 sm:h-14 sm:w-9" />
        <div className="battle-character__arm battle-character__arm--left absolute left-[18px] top-8 h-9 w-1.5 rounded-full sm:left-[20px] sm:top-9 sm:h-10" />
        <div className="battle-character__arm battle-character__arm--right absolute right-[18px] top-8 h-9 w-1.5 rounded-full sm:right-[20px] sm:top-9 sm:h-10" />
      </div>
    </div>
  );
}

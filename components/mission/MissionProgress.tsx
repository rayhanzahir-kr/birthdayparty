"use client";

import { TOTAL_LEVELS } from "@/lib/mission/content";

/** Indikator progress 1/4 … 4/4. */
export function MissionProgress({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-[color:var(--pr-muted)]">
        PROGRESS {level}/{TOTAL_LEVELS}
      </p>
      <div
        className="flex grow gap-1"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_LEVELS}
        aria-valuenow={level}
        aria-label={`Challenge ${level} of ${TOTAL_LEVELS}`}
      >
        {Array.from({ length: TOTAL_LEVELS }, (_, index) => (
          <span
            key={index}
            className={
              index < level
                ? "h-1 grow rounded-full bg-[color:var(--pr-accent)]"
                : "h-1 grow rounded-full bg-[color:var(--pr-muted)]/25"
            }
          />
        ))}
      </div>
    </div>
  );
}

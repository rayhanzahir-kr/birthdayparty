"use client";

import { INTRO_COPY, INTRO_CTA, INTRO_HEADING } from "@/lib/mission/content";
import { PR_BUTTON_GHOST, PR_BUTTON_PRIMARY } from "./TerminalBoot";

export function MissionIntro({
  guestName,
  onStart,
  onSkipMission,
}: {
  guestName: string;
  onStart: () => void;
  onSkipMission: () => void;
}) {
  return (
    <div className="pr-scanlines relative flex min-h-[100svh] flex-col justify-center px-5 py-10 sm:px-8">
      <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-[color:var(--pr-muted)]">
        PROJECT_R // CLEARANCE PENDING
      </p>

      <h1 className="mt-5 font-mono text-2xl leading-tight font-bold tracking-tight text-[color:var(--pr-accent)] sm:text-3xl md:text-4xl">
        {INTRO_HEADING}
      </h1>

      <p className="mt-2 font-mono text-sm text-[color:var(--pr-secondary)]">
        Agent: {guestName}
      </p>

      <p className="mt-6 max-w-prose text-pretty text-[0.9375rem] leading-relaxed text-[color:var(--pr-text)] sm:text-base">
        {INTRO_COPY}
      </p>

      <p className="mt-4 max-w-prose font-mono text-[0.75rem] leading-relaxed text-[color:var(--pr-muted)]">
        Four short challenges, roughly two minutes. Entirely optional — you can open the invitation
        and RSVP at any time.
      </p>

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
        <button type="button" onClick={onStart} className={PR_BUTTON_PRIMARY}>
          {INTRO_CTA}
        </button>
        <button type="button" onClick={onSkipMission} className={PR_BUTTON_GHOST}>
          Skip Mission → RSVP
        </button>
      </div>
    </div>
  );
}

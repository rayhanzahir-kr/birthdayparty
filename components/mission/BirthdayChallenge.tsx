"use client";

import { useEffect, useRef, useState } from "react";
import {
  BIRTHDAY_FORMAT_LABEL,
  BIRTHDAY_MAX_LENGTH,
  EXTRA_HINT,
  checkBirthdayAnswer,
  deniedMessageFor,
  shouldShowExtraHint,
} from "@/lib/mission/birthday";
import { LEVEL_3 } from "@/lib/mission/content";
import { MissionProgress } from "./MissionProgress";
import { PR_BUTTON_GHOST, PR_BUTTON_PRIMARY } from "./TerminalBoot";

/**
 * Level 3 — tanggal lahir.
 *
 * Batas privasi (PRD §05): isi input TIDAK pernah disimpan, di-log, atau
 * dikirim ke mana pun — termasuk tebakan salah. Nilai hanya hidup di state
 * React selama komponen aktif, dan dikosongkan setelah berhasil.
 *
 * Memakai input teks berlabel, bukan date picker yang bergantung locale.
 */
export function BirthdayChallenge({
  acceptBirthdayVariants = false,
  onPassed,
  onSkipMission,
}: {
  /** Default OFF sesuai PRD FR-04a. */
  acceptBirthdayVariants?: boolean;
  onPassed: (level: number) => void;
  onSkipMission: () => void;
}) {
  const [value, setValue] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [feedback, setFeedback] = useState<
    { kind: "denied"; text: string } | { kind: "format" } | null
  >(null);
  const [solved, setSolved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const advanced = useRef(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (solved) return;

    const verdict = checkBirthdayAnswer(value, { acceptBirthdayVariants });

    if (verdict.kind === "empty") {
      // Input kosong hanya menampilkan petunjuk format; BUKAN tebakan salah.
      setFeedback({ kind: "format" });
      inputRef.current?.focus();
      return;
    }

    if (verdict.kind === "correct") {
      setSolved(true);
      setFeedback(null);
      setValue(""); // jangan biarkan jawaban tertinggal di state
      return;
    }

    const attempts = failedAttempts + 1;
    setFailedAttempts(attempts);
    setFeedback({ kind: "denied", text: deniedMessageFor(attempts) });
    inputRef.current?.focus();
  }

  function next() {
    if (!solved || advanced.current) return;
    advanced.current = true;
    onPassed(3);
  }

  return (
    <div className="pr-scanlines relative flex min-h-[100svh] flex-col px-5 py-8 sm:px-8">
      <MissionProgress level={3} />

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 font-mono text-base font-bold tracking-wide text-[color:var(--pr-accent)] outline-none sm:text-lg"
      >
        {LEVEL_3.heading}
      </h1>

      <div className="mt-5 rounded-md border border-[color:var(--pr-muted)]/25 bg-[color:var(--pr-surface)] p-4 font-mono text-[0.8125rem] leading-relaxed">
        {LEVEL_3.terminalLines.map((line) => (
          <p key={line} className="break-words text-[color:var(--pr-secondary)]">
            {line}
          </p>
        ))}
        <p className="text-[color:var(--pr-secondary)]">
          &gt; Password: <span className="pr-caret text-[color:var(--pr-accent)]">_</span>
        </p>
      </div>

      <p className="mt-4 text-[0.875rem] leading-relaxed text-[color:var(--pr-text)]">
        <span className="text-[color:var(--pr-muted)]">Hint:</span> {LEVEL_3.hint}
      </p>

      {solved ? (
        <div aria-live="polite" className="mt-5">
          <p className="rounded-md border border-[color:var(--pr-accent)]/40 bg-[color:var(--pr-accent)]/10 px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-[color:var(--pr-accent)]">
            {LEVEL_3.successHeading}
          </p>
          <p className="mt-2.5 text-[0.9375rem] leading-relaxed">{LEVEL_3.success}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5" noValidate>
          <label
            htmlFor="pr-birthday"
            className="block font-mono text-[0.6875rem] tracking-[0.15em] text-[color:var(--pr-muted)]"
          >
            ENTER DATE
          </label>
          <input
            ref={inputRef}
            id="pr-birthday"
            name="birthday"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={BIRTHDAY_MAX_LENGTH}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setFeedback(null);
            }}
            placeholder={BIRTHDAY_FORMAT_LABEL}
            aria-describedby="pr-birthday-format pr-birthday-feedback"
            aria-invalid={feedback?.kind === "denied" ? true : undefined}
            className="mt-2 min-h-11 w-full rounded-md border border-[color:var(--pr-muted)]/35 bg-[color:var(--pr-bg)] px-4 py-2.5 font-mono tracking-wider text-[color:var(--pr-text)] placeholder:text-[color:var(--pr-muted)]/60 focus:border-[color:var(--pr-accent)] focus:outline-none"
          />
          <p id="pr-birthday-format" className="mt-2 font-mono text-[0.6875rem] text-[color:var(--pr-muted)]">
            Format: {BIRTHDAY_FORMAT_LABEL} · press Enter to submit
          </p>

          <div id="pr-birthday-feedback" aria-live="polite" className="mt-3 min-h-12">
            {feedback?.kind === "denied" ? (
              <p className="rounded-md border border-[color:var(--pr-muted)]/35 bg-[color:var(--pr-surface)] px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-[color:var(--pr-secondary)]">
                ✕ ACCESS DENIED — {feedback.text}
              </p>
            ) : feedback?.kind === "format" ? (
              <p className="font-mono text-[0.75rem] text-[color:var(--pr-muted)]">
                Enter the date as {BIRTHDAY_FORMAT_LABEL}.
              </p>
            ) : null}

            {shouldShowExtraHint(failedAttempts) ? (
              <p className="mt-2 rounded-md border border-[color:var(--pr-accent)]/30 px-4 py-2.5 font-mono text-[0.75rem] leading-relaxed text-[color:var(--pr-accent)]">
                HINT: {EXTRA_HINT}
              </p>
            ) : null}
          </div>

          <button type="submit" className={PR_BUTTON_PRIMARY}>
            DECRYPT
          </button>
        </form>
      )}

      <div className="mt-auto flex flex-col gap-2.5 pt-6 sm:flex-row">
        {solved ? (
          <button type="button" onClick={next} className={PR_BUTTON_PRIMARY}>
            Next →
          </button>
        ) : null}
        <button type="button" onClick={onSkipMission} className={PR_BUTTON_GHOST}>
          Skip Mission → RSVP
        </button>
      </div>
    </div>
  );
}

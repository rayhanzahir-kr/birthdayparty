"use client";

import { useEffect, useRef, useState } from "react";
import type { ChoiceChallengeSpec } from "@/lib/mission/content";
import { MissionProgress } from "./MissionProgress";
import { PR_BUTTON_GHOST, PR_BUTTON_PRIMARY } from "./TerminalBoot";

/**
 * Challenge pilihan ganda (Level 1, 2, 4).
 *
 * Blok kode Level 2 dirender sebagai TEKS INERT di dalam <pre>. Tidak ada
 * eksekusi kode, tidak ada runtime Java, dan tidak ada input tamu yang
 * dievaluasi (PRD FR-03).
 */
export function ChoiceChallenge({
  spec,
  onPassed,
  onSkipMission,
}: {
  spec: ChoiceChallengeSpec;
  onPassed: (level: number) => void;
  onSkipMission: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const advanced = useRef(false);

  // Fokus dipindahkan ke judul saat ganti level (PRD NFR-03).
  useEffect(() => {
    headingRef.current?.focus();
    setSelected(null);
    setSolved(false);
    setWrong(false);
    advanced.current = false;
  }, [spec.level]);

  function choose(id: string) {
    if (solved) return;
    setSelected(id);
    if (id === spec.correct) {
      setSolved(true);
      setWrong(false);
    } else {
      setWrong(true);
    }
  }

  function next() {
    // Proteksi klik/Enter ganda: hanya satu kali maju per jawaban benar.
    if (!solved || advanced.current) return;
    advanced.current = true;
    onPassed(spec.level);
  }

  return (
    <div className="pr-scanlines relative flex min-h-[100svh] flex-col px-5 py-8 sm:px-8">
      <MissionProgress level={spec.level} />

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 font-mono text-base font-bold tracking-wide text-[color:var(--pr-accent)] outline-none sm:text-lg"
      >
        {spec.heading}
      </h1>

      <p className="mt-4 text-pretty text-[0.9375rem] leading-relaxed sm:text-base">
        {spec.question}
      </p>

      {spec.code ? (
        <pre className="mt-5 overflow-x-auto rounded-md border border-[color:var(--pr-muted)]/25 bg-[color:var(--pr-surface)] p-4 font-mono text-[0.75rem] leading-relaxed text-[color:var(--pr-secondary)]">
          <code>{spec.code}</code>
        </pre>
      ) : null}

      <div role="radiogroup" aria-label={spec.question} className="mt-5 flex flex-col gap-2.5">
        {spec.options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrect = solved && option.id === spec.correct;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={solved && !isCorrect}
              onClick={() => choose(option.id)}
              className={[
                "flex min-h-11 w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors",
                "bg-[color:var(--pr-surface)]",
                isCorrect
                  ? "border-[color:var(--pr-accent)] text-[color:var(--pr-accent)]"
                  : isSelected
                    ? "border-[color:var(--pr-secondary)] text-[color:var(--pr-text)]"
                    : "border-[color:var(--pr-muted)]/25 text-[color:var(--pr-text)] hover:border-[color:var(--pr-secondary)]",
                solved && !isCorrect ? "opacity-50" : "",
              ].join(" ")}
            >
              <span className="font-mono text-[0.8125rem] text-[color:var(--pr-muted)]">
                {option.id}.
              </span>
              <span className={option.mono ? "font-mono text-[0.8125rem] break-all" : "text-[0.9375rem]"}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback diumumkan sopan ke pembaca layar, dan tidak hanya lewat warna. */}
      <div aria-live="polite" className="mt-5 min-h-12">
        {solved ? (
          <p className="rounded-md border border-[color:var(--pr-accent)]/40 bg-[color:var(--pr-accent)]/10 px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-[color:var(--pr-accent)]">
            ✓ ACCESS GRANTED — {spec.success}
          </p>
        ) : wrong ? (
          <p className="rounded-md border border-[color:var(--pr-muted)]/35 bg-[color:var(--pr-surface)] px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-[color:var(--pr-secondary)]">
            ✕ ACCESS DENIED — {spec.incorrect}
          </p>
        ) : null}
      </div>

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

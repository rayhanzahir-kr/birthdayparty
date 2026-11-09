"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const LINES = [
  "init birthday://protocol",
  "resolve invitation branch",
  "verify personal token",
  "render party payload",
];

/**
 * Boot sequence cinematic selama ~1,8 detik.
 *
 * Aturan aksesibilitas yang dipegang di sini:
 *   * Overlay TIDAK memblokir undangan — konten asli sudah ter-render di bawah
 *     dan boot otomatis hilang; tombol "Lewati" ada di area yang bisa difokus.
 *   * prefers-reduced-motion => boot dilewati sepenuhnya, tanpa kilatan.
 *   * Tidak ada audio dan tidak ada kilatan cepat.
 */
export function BootSequence() {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const skipRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Keputusan dibuat setelah mount supaya hydration tidak pernah mismatch
    // dan supaya tamu dengan reduced motion tidak pernah melihat overlay.
    if (prefersReducedMotion) return;
    setVisible(true);

    const stepTimers = LINES.map((_, index) =>
      window.setTimeout(() => setStep(index + 1), 220 + index * 330),
    );
    const endTimer = window.setTimeout(() => setVisible(false), 1800);

    return () => {
      stepTimers.forEach(window.clearTimeout);
      window.clearTimeout(endTimer);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (visible) skipRef.current?.focus();
  }, [visible]);

  // Escape juga melewati boot.
  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/97 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="region"
          aria-label="Invitation intro"
          onClick={() => setVisible(false)}
        >
          <div className="w-full max-w-sm font-mono text-[0.8125rem]">
            <p className="label-mono mb-4 text-violet-neon">birthday://protocol</p>
            <ul className="space-y-2">
              {LINES.map((line, index) => (
                <li
                  key={line}
                  className={
                    index < step
                      ? "flex items-center gap-2 text-ink"
                      : "flex items-center gap-2 text-ink-faint/35"
                  }
                >
                  <span className={index < step ? "text-ok" : "text-ink-faint/40"}>
                    {index < step ? "✓" : "·"}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 h-px w-full overflow-hidden bg-edge">
              <motion.div
                className="h-px bg-linear-to-r from-violet-neon to-cyan-neon"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.7, ease: "easeInOut" }}
              />
            </div>
            <button
              ref={skipRef}
              type="button"
              onClick={() => setVisible(false)}
              className="tap mt-5 font-mono text-[0.75rem] text-ink-muted underline decoration-dotted underline-offset-4 hover:text-cyan-neon"
            >
              Skip intro
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

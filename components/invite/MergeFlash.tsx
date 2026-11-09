"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GitMerge } from "lucide-react";

/**
 * Animasi "merge" — HANYA dipicu setelah server mengonfirmasi penyimpanan
 * attending (PRD §4.2 poin 8). Tidak ada kilatan cepat; durasi ~1,4 detik dan
 * sepenuhnya dinonaktifkan pada prefers-reduced-motion.
 */
export function MergeFlash({ show, onDone }: { show: boolean; onDone: () => void }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-40 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onAnimationComplete={() => {
            window.setTimeout(onDone, 1100);
          }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" />
          <motion.div
            className="relative flex flex-col items-center gap-3"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg viewBox="0 0 120 80" className="w-44" fill="none">
              <path
                d="M20 68 L20 30 Q20 14 44 14 L92 14"
                stroke="var(--color-cyan-neon)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 6"
                className="dash-flow"
              />
              <motion.path
                d="M20 68 L92 68"
                stroke="var(--color-violet-neon)"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
              <circle cx="92" cy="14" r="5" fill="var(--color-cyan-neon)" />
              <circle cx="92" cy="68" r="5" fill="var(--color-violet-neon)" />
            </svg>
            <p className="flex items-center gap-2 font-mono text-sm text-ok">
              <GitMerge className="size-4" />
              merged — kamu resmi ikut
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

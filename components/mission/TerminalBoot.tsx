"use client";

import { useEffect, useRef, useState } from "react";
import { BOOT_LINES } from "@/lib/mission/content";

/**
 * Boot terminal teatrikal.
 *
 * PENTING: baris "Authenticating guest token..." murni hiasan. Validasi token
 * sebenarnya sudah selesai di server sebelum komponen ini dirender — tidak ada
 * mekanisme keamanan baru di sini (PRD FR-01).
 *
 * Nama tamu disisipkan sebagai TEKS lewat React, bukan HTML mentah.
 */
export function TerminalBoot({
  guestName,
  reducedMotion,
  onDone,
  onSkipAnimation,
  onSkipMission,
}: {
  guestName: string;
  reducedMotion: boolean;
  onDone: () => void;
  onSkipAnimation: () => void;
  onSkipMission: () => void;
}) {
  const lines = BOOT_LINES.map((line) => line.replace("{guestName}", guestName));
  // Reduced motion: tampilkan state akhir seketika, tanpa animasi apa pun.
  const [visibleCount, setVisibleCount] = useState(reducedMotion ? lines.length : 0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reducedMotion) {
      const t = window.setTimeout(onDone, 400);
      timers.current.push(t);
      return () => window.clearTimeout(t);
    }

    // Total ~3,2 detik, di bawah batas ~5 detik pada PRD.
    lines.forEach((_, index) => {
      timers.current.push(
        window.setTimeout(() => setVisibleCount(index + 1), 180 + index * 420),
      );
    });
    timers.current.push(window.setTimeout(onDone, 180 + lines.length * 420 + 500));

    const snapshot = timers.current;
    return () => snapshot.forEach(window.clearTimeout);
    // lines dibangun dari konstanta + guestName; guestName stabil per halaman.
  }, [reducedMotion, guestName, onDone, lines.length]);

  return (
    <div className="pr-scanlines relative flex min-h-[100svh] flex-col px-5 py-8 sm:px-8">
      <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-[color:var(--pr-muted)]">
        PROJECT_R // SECURE TERMINAL
      </p>

      <div className="mt-8 grow font-mono text-[0.8125rem] leading-relaxed sm:text-sm">
        {lines.slice(0, visibleCount).map((line, index) => (
          <p key={line} className="break-words">
            <span className="text-[color:var(--pr-accent)]">&gt;</span>{" "}
            <span className={index >= 4 ? "text-[color:var(--pr-secondary)]" : undefined}>
              {line}
            </span>
          </p>
        ))}
        {visibleCount < lines.length ? (
          <span className="pr-caret inline-block text-[color:var(--pr-accent)]">_</span>
        ) : null}
      </div>

      {/* Kedua aksi skip tersedia SEJAK AWAL, tidak menunggu animasi selesai. */}
      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
        <button type="button" onClick={onSkipAnimation} className={PR_BUTTON_GHOST}>
          Skip Animation
        </button>
        <button type="button" onClick={onSkipMission} className={PR_BUTTON_GHOST}>
          Skip Mission → RSVP
        </button>
      </div>
    </div>
  );
}

export const PR_BUTTON_PRIMARY =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[color:var(--pr-accent)] " +
  "bg-[color:var(--pr-accent)] px-5 py-2.5 font-mono text-[0.8125rem] tracking-wide text-[color:var(--pr-bg)] " +
  "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const PR_BUTTON_GHOST =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[color:var(--pr-muted)]/35 " +
  "bg-[color:var(--pr-surface)] px-5 py-2.5 font-mono text-[0.8125rem] tracking-wide text-[color:var(--pr-text)] " +
  "transition-colors hover:border-[color:var(--pr-accent)] hover:text-[color:var(--pr-accent)]";

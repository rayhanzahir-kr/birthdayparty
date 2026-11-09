"use client";

import { Component, type ReactNode } from "react";

/**
 * Error boundary khusus mission.
 *
 * Perannya terbatas: memulihkan GAME saja. Ia tidak pernah memalsukan validasi
 * token — undangan yang ditawarkan di sini adalah undangan yang sama, yang
 * sudah lolos validasi server sebelum halaman dirender (PRD SEC-03, NFR-08).
 */
interface Props {
  children: ReactNode;
  onOpenInvitation: () => void;
}

interface State {
  failed: boolean;
}

export class MissionBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch() {
    // Sengaja tidak mencatat detail error ke konsol: layar personal tidak boleh
    // menumpahkan data tamu ke log mana pun.
  }

  override render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex min-h-[100svh] flex-col justify-center px-5 py-10 sm:px-8">
        <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-[color:var(--pr-muted)]">
          PROJECT_R // MISSION FAULT
        </p>
        <h1 className="mt-4 font-mono text-xl font-bold text-[color:var(--pr-accent)]">
          The mission crashed
        </h1>
        <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-[color:var(--pr-text)]">
          The game hit an error, but your invitation is unaffected. You can open it and RSVP right
          now.
        </p>
        <button
          type="button"
          onClick={this.props.onOpenInvitation}
          className="mt-6 inline-flex min-h-11 items-center justify-center self-start rounded-md border border-[color:var(--pr-accent)] bg-[color:var(--pr-accent)] px-5 py-2.5 font-mono text-[0.8125rem] text-[color:var(--pr-bg)]"
        >
          Open Invitation →
        </button>
      </div>
    );
  }
}

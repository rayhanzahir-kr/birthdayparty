import type { Metadata } from "next";
import Link from "next/link";
import { Link2, ShieldCheck, Sparkles, LayoutDashboard } from "lucide-react";
import { Panel, buttonClass } from "@/components/ui/primitives";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/ui/SetupNotice";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BIRTHDAY://PROTOCOL",
  description: "A personal invitation. Open it with the link your host sent you.",
  robots: { index: false, follow: false },
};

/**
 * Landing publik.
 *
 * Sengaja TIDAK memuat daftar tamu, nama tamu, tanggal, atau lokasi acara —
 * halaman ini bisa dibuka siapa saja, jadi tidak ada informasi privat di sini
 * (PRD §4.1).
 */
export default function LandingPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-14 sm:px-6 sm:py-20">
      <p className="label-mono text-violet-neon">birthday://protocol</p>

      <h1 className="mt-4 text-balance text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl md:text-6xl">
        <span className="bg-linear-to-br from-ink via-violet-neon to-cyan-neon bg-clip-text text-transparent">
          An invitation opened
        </span>
        <br />
        <span className="text-ink">with a personal link.</span>
      </h1>

      <p className="mt-5 max-w-prose text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
        Every guest gets their own link. No guest list on this page, no account to create, and no
        event details until a personal link is opened.
      </p>

      <Panel className="mt-9 px-5 py-6 sm:px-7">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-ink">
          <Link2 className="size-4 shrink-0 text-cyan-neon" aria-hidden="true" />
          How to open your invitation
        </h2>
        <ol className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink-muted">
          <Step n={1}>
            Find the message from your host containing a link that starts with{" "}
            <code className="rounded bg-void-2 px-1.5 py-0.5 font-mono text-[0.8125rem] text-cyan-neon">
              /invite/
            </code>
            .
          </Step>
          <Step n={2}>Open it. Your name and the event details appear right away, no password.</Step>
          <Step n={3}>
            Choose Attending, Maybe, or Can't make it. For Attending only, there's one extra key
            your host has told you.
          </Step>
        </ol>

        <p className="mt-5 rounded-lg border border-edge-bright bg-void-2/60 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-ink-faint">
          Haven't received a link, or it won't open? Contact your host directly. This page cannot
          look up or create invitations.
        </p>
      </Panel>

      {!configured ? (
        <div className="mt-6">
          <SetupNotice context="landing" />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/demo" className={buttonClass("ghost")}>
          <Sparkles className="size-4" aria-hidden="true" />
          See a visual demo
        </Link>
        <Link href="/admin" className={buttonClass("subtle")}>
          <LayoutDashboard className="size-4" aria-hidden="true" />
          Sign in as host
        </Link>
      </div>

      <p className="mt-10 flex items-start gap-2 font-mono text-[0.6875rem] leading-relaxed text-ink-faint">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        An invitation link works like a key: anyone holding it can read the invitation and change
        one RSVP answer. The system limits one slot per invitation; it does not verify a person's
        identity.
      </p>
    </main>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-violet-neon/50 bg-violet-neon/12 font-mono text-[0.6875rem] text-violet-neon">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

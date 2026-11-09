"use client";

import { useRef, useState } from "react";
import { GitPullRequest } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { BootSequence } from "./BootSequence";
import { EventCard } from "./EventCard";
import { GuestHero } from "./GuestHero";
import { MergeFlash } from "./MergeFlash";
import { PartyPass } from "./PartyPass";
import { PullRequestHeader, PullRequestTimeline } from "./PullRequestPanel";
import { RsvpForm, type SavedRsvp } from "./RsvpForm";
import { TerminalPanel } from "./TerminalPanel";
import { formatShortDateTime } from "@/lib/datetime";
import type { InvitationView } from "@/lib/types";

/**
 * Orkestrator pengalaman undangan.
 *
 * `invitation` datang dari Server Component yang sudah memvalidasi token, jadi
 * komponen ini tidak pernah melihat atau menyimpan token_hash. Token mentah
 * hanya disimpan untuk dikirim kembali pada submit RSVP.
 */
export function InviteExperience({
  token,
  invitation,
  demo = false,
}: {
  token: string;
  invitation: InvitationView;
  demo?: boolean;
}) {
  const [saved, setSaved] = useState<SavedRsvp | null>(invitation.rsvp);
  const [mergeVisible, setMergeVisible] = useState(false);
  const passRef = useRef<HTMLDivElement | null>(null);

  function handleSaved(next: SavedRsvp) {
    const becameAttending = next.status === "attending" && saved?.status !== "attending";
    setSaved(next);

    // Merge flash + scroll ke pass hanya untuk attending yang BARU tersimpan.
    if (next.status === "attending") {
      if (becameAttending) setMergeVisible(true);
      window.setTimeout(() => {
        passRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, becameAttending ? 1500 : 250);
    }
  }

  const respondedLabel = saved
    ? `Terakhir diperbarui ${formatShortDateTime(saved.updated_at, invitation.event.timezone)} (${invitation.event.timezone})`
    : null;

  return (
    <>
      {demo ? null : <BootSequence />}
      <MergeFlash show={mergeVisible} onDone={() => setMergeVisible(false)} />

      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 sm:gap-6">
          <GuestHero guestName={invitation.guest.name} hostName={invitation.event.host_name} />

          <EventCard event={invitation.event} />

          <Panel>
            <PanelHeader
              icon={<GitPullRequest className="size-4" />}
              title="rsvp.pull-request"
              meta={demo ? "mode demo" : "disimpan di server"}
              accent="cyan"
            />
            <PullRequestHeader guestName={invitation.guest.name} status={saved?.status ?? null} />
            <RsvpForm
              token={token}
              saved={saved}
              deadlinePassed={invitation.deadline_passed}
              onSaved={handleSaved}
              demo={demo}
            />
            <PullRequestTimeline status={saved?.status ?? null} respondedLabel={respondedLabel} />
          </Panel>

          {/* Pass hanya untuk respons TERSIMPAN yang berstatus attending. */}
          {saved?.status === "attending" ? (
            <div ref={passRef}>
              <PartyPass guestName={invitation.guest.name} event={invitation.event} />
            </div>
          ) : null}

          <TerminalPanel
            guestName={invitation.guest.name}
            eventTitle={invitation.event.title}
            status={saved?.status ?? null}
          />

          <p className="px-1 text-center font-mono text-[0.6875rem] leading-relaxed text-ink-faint">
            Link ini bersifat personal. Siapa pun yang memegang link dapat membaca undangan dan
            mengubah satu jawaban RSVP, jadi jangan dibagikan ke orang lain.
          </p>
        </div>
      </div>
    </>
  );
}

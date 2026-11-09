"use client";

import { motion, useReducedMotion } from "motion/react";
import { Ticket, MapPin, CalendarClock, UserRound } from "lucide-react";
import { formatShortDateTime, PLACEHOLDER_DATE } from "@/lib/datetime";
import { cx } from "@/components/ui/primitives";
import type { InvitationView } from "@/lib/types";

/**
 * Digital party pass.
 *
 * Hanya dirender saat respons TERSIMPAN adalah attending. Kartu ini sengaja
 * TIDAK memuat token atau hash (PRD §4.3), dan bukan alat verifikasi identitas
 * atau check-in — QR dan validasi tiket di pintu di luar cakupan MVP.
 * Penyimpanan untuk MVP: screenshot.
 */
export function PartyPass({
  guestName,
  event,
}: {
  guestName: string;
  event: InvitationView["event"];
}) {
  const prefersReducedMotion = useReducedMotion();
  const dateText = formatShortDateTime(event.event_date, event.timezone);

  return (
    <motion.section
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="party-pass-title"
      className="relative overflow-hidden rounded-[var(--radius-panel)] border border-cyan-neon/40 bg-linear-to-br from-violet-deep/35 via-panel to-cyan-deep/25"
    >
      {/* Perforasi tiket. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-[62%] border-t border-dashed border-cyan-neon/30"
      />
      <span
        aria-hidden="true"
        className="absolute top-[62%] -left-2.5 size-5 -translate-y-1/2 rounded-full bg-void"
      />
      <span
        aria-hidden="true"
        className="absolute top-[62%] -right-2.5 size-5 -translate-y-1/2 rounded-full bg-void"
      />

      <div className="px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="label-mono text-cyan-neon">digital party pass</p>
            <h2
              id="party-pass-title"
              className="mt-1 truncate text-lg font-semibold tracking-tight text-ink sm:text-xl"
            >
              {event.title}
            </h2>
          </div>
          <Ticket className="size-7 shrink-0 text-cyan-neon" aria-hidden="true" />
        </div>

        <p className="mt-5 label-mono">Guest name</p>
        <p className="mt-0.5 text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-3xl">
          {guestName}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-ok/40 bg-ok/12 px-3 py-1.5 font-mono text-[0.75rem] text-ok">
          <span aria-hidden="true">✓</span>
          Status: Attending
        </div>
      </div>

      <div className="grid gap-x-5 gap-y-3.5 px-5 pt-5 pb-5 sm:grid-cols-2 sm:px-7 sm:pb-6">
        <PassRow
          icon={<CalendarClock className="size-4" />}
          label="Date & time"
          value={dateText}
          placeholder={!event.event_date}
          note={event.event_date ? event.timezone : undefined}
        />
        <PassRow icon={<MapPin className="size-4" />} label="Location" value={event.location_name} />
        <PassRow icon={<UserRound className="size-4" />} label="Admits" value="1 person" />
        <PassRow
          icon={<UserRound className="size-4" />}
          label="Host"
          value={event.host_name}
        />
      </div>

      <p className="border-t border-cyan-neon/20 px-5 py-3 text-[0.75rem] leading-relaxed text-ink-faint sm:px-7">
        Save this pass with a screenshot. It serves as a record of attendance, not proof of
        identity, and isn't used for check-in at the door.
      </p>
    </motion.section>
  );
}

function PassRow({
  icon,
  label,
  value,
  note,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  placeholder?: boolean;
}) {
  const isPlaceholder = placeholder || value === PLACEHOLDER_DATE;
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 text-cyan-neon" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="label-mono">{label}</p>
        <p className={cx("text-[0.875rem] break-words", isPlaceholder ? "text-ink-faint italic" : "text-ink")}>
          {value}
          {note ? <span className="ml-1.5 font-mono text-[0.6875rem] text-ink-faint">{note}</span> : null}
        </p>
      </div>
    </div>
  );
}

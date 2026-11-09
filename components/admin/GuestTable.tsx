"use client";

import { useMemo, useState } from "react";
import { Link2Off, Link2, RefreshCw, Search, Inbox, MessageSquareQuote } from "lucide-react";
import {
  Panel,
  PanelHeader,
  Spinner,
  StatusPill,
  buttonClass,
  cx,
  inputClass,
} from "@/components/ui/primitives";
import { formatShortDateTime } from "@/lib/datetime";
import { RSVP_STATUS_LABEL, type GuestSummaryRow, type RsvpStatus } from "@/lib/types";

type FilterValue = "all" | RsvpStatus | "pending" | "inactive";

const FILTERS: Array<{ value: FilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "No answer" },
  { value: "attending", label: "Attending" },
  { value: "maybe", label: "Maybe" },
  { value: "declined", label: "Can't make it" },
  { value: "inactive", label: "Deactivated" },
];

interface GuestTableProps {
  guests: GuestSummaryRow[];
  timezone: string;
  loading: boolean;
  error: string | null;
  busyGuestId: string | null;
  onRefresh: () => void;
  onRotate: (guest: GuestSummaryRow) => void;
  onToggleActive: (guest: GuestSummaryRow) => void;
}

export function GuestTable({
  guests,
  timezone,
  loading,
  error,
  busyGuestId,
  onRefresh,
  onRotate,
  onToggleActive,
}: GuestTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return guests.filter((guest) => {
      if (needle && !guest.name.toLowerCase().includes(needle)) return false;
      switch (filter) {
        case "all":
          return true;
        case "pending":
          return guest.status === null;
        case "inactive":
          return !guest.is_active;
        default:
          return guest.status === filter;
      }
    });
  }, [guests, query, filter]);

  return (
    <Panel>
      <PanelHeader
        title="guests.list"
        meta={`${visible.length} / ${guests.length} guests`}
        accent="cyan"
      />

      <div className="flex flex-col gap-3 border-b border-edge px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative grow">
            <label htmlFor="guest-search" className="sr-only">
              Search guest name
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <input
              id="guest-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guest name…"
              className={cx(inputClass, "pl-10")}
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={buttonClass("ghost", "shrink-0")}
          >
            {loading ? <Spinner /> : <RefreshCw className="size-4" aria-hidden="true" />}
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filter">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cx(
                "tap rounded-full border px-3 py-1.5 font-mono text-[0.6875rem] transition-colors",
                filter === item.value
                  ? "border-violet-neon bg-violet-neon/15 text-violet-neon"
                  : "border-edge-bright bg-void-2/60 text-ink-faint hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="px-4 py-8 text-center sm:px-5">
          <p className="text-[0.875rem] text-bad" role="alert">
            {error}
          </p>
          <button type="button" onClick={onRefresh} className={buttonClass("ghost", "mt-4")}>
            <RefreshCw className="size-4" aria-hidden="true" /> Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="px-4 py-12 text-center sm:px-5">
          <Inbox className="mx-auto size-7 text-ink-faint" aria-hidden="true" />
          <p className="mt-3 text-[0.875rem] text-ink-muted">
            {guests.length === 0
              ? "No guests yet. Add your first guest in the panel above."
              : "No guests match this search or filter."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-edge">
          {visible.map((guest) => (
            <GuestRow
              key={guest.id}
              guest={guest}
              timezone={timezone}
              busy={busyGuestId === guest.id}
              onRotate={() => onRotate(guest)}
              onToggleActive={() => onToggleActive(guest)}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function GuestRow({
  guest,
  timezone,
  busy,
  onRotate,
  onToggleActive,
}: {
  guest: GuestSummaryRow;
  timezone: string;
  busy: boolean;
  onRotate: () => void;
  onToggleActive: () => void;
}) {
  const rsvp = rsvpPill(guest.status);

  return (
    <li className={cx("px-4 py-4 sm:px-5", !guest.is_active && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{guest.name}</p>
          <p className="label-mono mt-1">
            Added {formatShortDateTime(guest.created_at, timezone)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={rsvp.tone} glyph={rsvp.glyph}>
            {rsvp.label}
          </StatusPill>
          <StatusPill
            tone={guest.is_active ? "info" : "idle"}
            glyph={guest.is_active ? "◉" : "◌"}
          >
            {guest.is_active ? "Link active" : "Link disabled"}
          </StatusPill>
        </div>
      </div>

      {guest.status ? (
        <p className="label-mono mt-2">
          Answered {formatShortDateTime(guest.responded_at, timezone)}
          {guest.updated_at && guest.updated_at !== guest.responded_at
            ? ` · changed ${formatShortDateTime(guest.updated_at, timezone)}`
            : ""}
        </p>
      ) : null}

      {guest.message ? (
        <p className="mt-2.5 flex gap-2 rounded-lg border border-edge-bright bg-void-2/60 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
          <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0 text-cyan-neon" aria-hidden="true" />
          <span className="min-w-0 break-words">{guest.message}</span>
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRotate}
          disabled={busy}
          className={buttonClass("ghost", "px-3 py-2 text-[0.75rem]")}
        >
          {busy ? <Spinner /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
          Regenerate link
        </button>
        <button
          type="button"
          onClick={onToggleActive}
          disabled={busy}
          className={buttonClass(
            guest.is_active ? "danger" : "ghost",
            "px-3 py-2 text-[0.75rem]",
          )}
        >
          {guest.is_active ? (
            <>
              <Link2Off className="size-3.5" aria-hidden="true" /> Disable link
            </>
          ) : (
            <>
              <Link2 className="size-3.5" aria-hidden="true" /> Re-enable
            </>
          )}
        </button>
      </div>
    </li>
  );
}

function rsvpPill(status: RsvpStatus | null): {
  label: string;
  glyph: string;
  tone: "ok" | "warn" | "bad" | "idle";
} {
  switch (status) {
    case "attending":
      return { label: RSVP_STATUS_LABEL.attending, glyph: "✓", tone: "ok" };
    case "maybe":
      return { label: RSVP_STATUS_LABEL.maybe, glyph: "◐", tone: "warn" };
    case "declined":
      return { label: RSVP_STATUS_LABEL.declined, glyph: "✕", tone: "bad" };
    default:
      return { label: "No answer", glyph: "○", tone: "idle" };
  }
}

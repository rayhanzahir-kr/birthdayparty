import { CalendarClock, MapPin, Shirt, UserRound, Hourglass, ExternalLink } from "lucide-react";
import { Panel, PanelHeader, cx } from "@/components/ui/primitives";
import { formatEventDateTime, PLACEHOLDER_DATE } from "@/lib/datetime";
import type { InvitationView } from "@/lib/types";

/**
 * Kartu detail acara. Semua waktu diformat pada zona waktu ACARA, bukan zona
 * waktu perangkat, dan nama zona selalu ikut ditulis.
 */
export function EventCard({ event }: { event: InvitationView["event"] }) {
  const dateText = formatEventDateTime(event.event_date, event.timezone);
  const deadlineText = event.rsvp_deadline
    ? formatEventDateTime(event.rsvp_deadline, event.timezone)
    : "Tidak ditetapkan";

  return (
    <Panel>
      <PanelHeader
        icon={<CalendarClock className="size-4" />}
        title="event.config"
        meta={`TZ ${event.timezone}`}
      />
      <div className="px-5 py-5 sm:px-6">
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{event.title}</h2>
        {event.description ? (
          <p className="mt-2 max-w-prose text-pretty text-sm leading-relaxed text-ink-muted">
            {event.description}
          </p>
        ) : null}

        <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Row icon={<UserRound className="size-4" />} label="Penyelenggara" value={event.host_name} />
          <Row
            icon={<CalendarClock className="size-4" />}
            label="Tanggal & jam"
            value={dateText}
            pending={!event.event_date}
          />
          <Row
            icon={<MapPin className="size-4" />}
            label="Lokasi"
            value={event.location_name}
            href={event.location_url}
          />
          <Row icon={<Shirt className="size-4" />} label="Dress code" value={event.dress_code} />
          <Row
            icon={<Hourglass className="size-4" />}
            label="Batas RSVP"
            value={deadlineText}
            pending={!event.rsvp_deadline}
          />
        </dl>

        {!event.event_date ? (
          <p className="mt-5 rounded-lg border border-warn/30 bg-warn/8 px-3.5 py-2.5 text-[0.8125rem] text-warn">
            Tanggal pasti belum diumumkan. Jawabanmu tetap tercatat dan detail akan menyusul.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function Row({
  icon,
  label,
  value,
  href,
  pending,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string | null;
  pending?: boolean;
}) {
  const isPlaceholder = pending || value === PLACEHOLDER_DATE;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-violet-neon" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="label-mono">{label}</dt>
        <dd className={cx("mt-0.5 text-sm break-words", isPlaceholder ? "text-ink-faint italic" : "text-ink")}>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="tap inline-flex items-center gap-1.5 text-cyan-neon underline decoration-dotted underline-offset-4 hover:decoration-solid"
            >
              {value}
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">(buka peta di tab baru)</span>
            </a>
          ) : (
            value
          )}
        </dd>
      </div>
    </div>
  );
}

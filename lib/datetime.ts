/**
 * Semua timestamp disimpan sebagai timestamptz (UTC instant) dan DITAMPILKAN
 * dalam zona waktu acara — bukan zona waktu perangkat tamu (PRD §5).
 */

export const PLACEHOLDER_DATE = "Belum ditentukan";

/** Validasi nama zona waktu IANA lewat Intl, tanpa daftar hardcoded. */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.trim().length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function safeTimeZone(tz: string): string {
  return isValidTimeZone(tz) ? tz : "UTC";
}

/** Contoh hasil: "Sabtu, 10 November 2026 · 19.30 (CET)". */
export function formatEventDateTime(iso: string | null, timezone: string): string {
  if (!iso) return PLACEHOLDER_DATE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER_DATE;

  const tz = safeTimeZone(timezone);
  const datePart = new Intl.DateTimeFormat("id-ID", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("id-ID", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const zonePart = zoneAbbreviation(date, tz);

  return `${datePart} · ${timePart} (${zonePart})`;
}

/** Versi pendek untuk tabel admin dan party pass. */
export function formatShortDateTime(iso: string | null, timezone: string): string {
  if (!iso) return PLACEHOLDER_DATE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER_DATE;
  const tz = safeTimeZone(timezone);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function zoneAbbreviation(date: Date, timezone: string): string {
  const tz = safeTimeZone(timezone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

/**
 * Deadline dievaluasi di server terhadap waktu nyata. `now` dapat disuntik
 * untuk pengujian deterministik.
 */
export function isDeadlinePassed(deadlineIso: string | null, now: Date = new Date()): boolean {
  if (!deadlineIso) return false;
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) return false;
  return now.getTime() > deadline.getTime();
}

/**
 * Deadline RSVP tidak boleh sesudah waktu mulai acara bila keduanya diisi
 * (PRD §5).
 */
export function isDeadlineConsistent(
  eventDateIso: string | null,
  deadlineIso: string | null,
): boolean {
  if (!eventDateIso || !deadlineIso) return true;
  const eventDate = new Date(eventDateIso);
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(eventDate.getTime()) || Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() <= eventDate.getTime();
}

/**
 * Mengubah nilai `datetime-local` (tanpa offset) menjadi instant UTC pada zona
 * waktu acara, sehingga admin yang mengisi "19:30 Europe/Berlin" tidak bergeser
 * karena zona waktu browser.
 */
export function zonedLocalInputToIso(localValue: string, timezone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m as unknown as [string, string, string, string, string, string];
  const tz = safeTimeZone(timezone);

  // Tebak instant dengan asumsi UTC, lalu koreksi dengan offset nyata zona itu.
  const guess = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  let instant = guess;
  for (let i = 0; i < 3; i += 1) {
    const offset = timeZoneOffsetMs(new Date(instant), tz);
    const next = guess - offset;
    if (next === instant) break;
    instant = next;
  }
  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/** Kebalikannya: instant UTC -> string `datetime-local` pada zona waktu acara. */
export function isoToZonedLocalInput(iso: string | null, timezone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tz = safeTimeZone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Offset zona waktu (ms) pada instant tertentu. */
function timeZoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const hour = get("hour") === 24 ? 0 : get("hour");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return asUtc - date.getTime();
}

import { z } from "zod";
import { isValidTimeZone } from "./datetime";
import { PASSWORD_MAX_RAW_LENGTH } from "./password-format";
import { RSVP_STATUSES } from "./types";

export const MESSAGE_MAX_LENGTH = 500;
export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 100;

/** Hanya http/https; menolak javascript:, data:, dan skema lain (PRD §5). */
export function sanitizeExternalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (trimmed.length > 2000) return null;
  return parsed.toString();
}

const optionalUrl = z
  .string()
  .max(2000)
  .transform((v) => v.trim())
  .refine((v) => v.length === 0 || sanitizeExternalUrl(v) !== null, {
    message: "URL must start with http:// or https://",
  })
  .transform((v) => (v.length === 0 ? null : sanitizeExternalUrl(v)));

/** Nama tamu: wajib 1–100 karakter SETELAH trim. Nama duplikat diizinkan. */
export const guestNameSchema = z
  .string()
  .max(300)
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .refine((v) => v.length >= NAME_MIN_LENGTH && v.length <= NAME_MAX_LENGTH, {
    message: `Name must be 1–${NAME_MAX_LENGTH} characters.`,
  });

export const createGuestSchema = z.object({ name: guestNameSchema }).strict();

/**
 * Payload RSVP dari tamu.
 *
 * `.strict()` menolak field tambahan seperti guest_count, +1, guest_id, name,
 * atau event_id. Identitas tamu SELALU diturunkan server dari token.
 */
export const rsvpSubmitSchema = z
  .object({
    token: z.string().min(1).max(64),
    status: z.enum(RSVP_STATUSES as unknown as [string, ...string[]]),
    message: z
      .string()
      .max(2000)
      .transform((v) => v.trim())
      .refine((v) => v.length <= MESSAGE_MAX_LENGTH, {
        message: `Message can be at most ${MESSAGE_MAX_LENGTH} characters.`,
      })
      .transform((v) => (v.length === 0 ? null : v))
      .optional()
      .default(""),
    password: z.string().max(PASSWORD_MAX_RAW_LENGTH).optional(),
  })
  .strict();

export type RsvpSubmitInput = z.infer<typeof rsvpSubmitSchema>;

const optionalDateTime = z
  .string()
  .max(40)
  .transform((v) => v.trim())
  .refine((v) => v.length === 0 || !Number.isNaN(new Date(v).getTime()), {
    message: "Invalid date format.",
  })
  .transform((v) => (v.length === 0 ? null : new Date(v).toISOString()))
  .nullable()
  .default(null);

export const eventSettingsSchema = z
  .object({
    title: z.string().min(1).max(120).transform((v) => v.trim()),
    host_name: z.string().min(1).max(120).transform((v) => v.trim()),
    timezone: z.string().min(1).max(64).refine(isValidTimeZone, {
      message: "Unknown IANA time zone.",
    }),
    event_date: optionalDateTime,
    location_name: z.string().min(1).max(200).transform((v) => v.trim()),
    location_url: optionalUrl.nullable().default(null),
    dress_code: z.string().min(1).max(120).transform((v) => v.trim()),
    description: z.string().max(1200).transform((v) => v.trim()),
    rsvp_deadline: optionalDateTime,
  })
  .strict();

export type EventSettingsInput = z.infer<typeof eventSettingsSchema>;

export const setActiveSchema = z.object({ is_active: z.boolean() }).strict();

/** Membaca JSON request dengan batas ukuran payload. */
export const MAX_BODY_BYTES = 8 * 1024;

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new BodyError("Content-Type must be application/json.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new BodyError("Payload too large.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new BodyError("Payload too large.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BodyError("Body is not valid JSON.");
  }
}

export class BodyError extends Error {}

/**
 * Menerjemahkan issue Zod menjadi pesan berbahasa Indonesia.
 *
 * `unrecognized_keys` muncul ketika payload membawa field yang tidak diizinkan
 * (guest_count, +1, guest_id, name, event_id). Pesannya tidak menyebut nama
 * field asing agar respons tidak memetakan skema internal.
 */
export function describeIssue(issue: { code?: string; message?: string; path?: PropertyKey[] } | undefined): string {
  if (!issue) return "Invalid data.";
  if (issue.code === "unrecognized_keys") {
    return "This request contains fields that are not allowed.";
  }
  if (issue.code === "invalid_value" || issue.code === "invalid_enum_value") {
    return "Unknown answer option.";
  }
  return issue.message && /[a-z]/.test(issue.message) && !/^[A-Z][a-z]+ /.test(issue.message)
    ? issue.message
    : issue.message ?? "Invalid data.";
}

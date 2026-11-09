import "server-only";
import { getServiceClient } from "./supabase/admin";
import { hashToken, isTokenShapeValid } from "./tokens";
import { isDeadlinePassed } from "./datetime";
import type { InvitationView, RsvpStatus } from "./types";
import { logServerEvent } from "./http";

/**
 * Pembacaan undangan publik.
 *
 * Hanya field yang dibutuhkan undangan yang dikembalikan — tanpa token_hash,
 * tanpa guest lain, tanpa event id internal (PRD §7).
 */
export async function loadInvitation(token: string): Promise<InvitationView | null> {
  if (!isTokenShapeValid(token)) return null;

  const { data, error } = await getServiceClient()
    .from("guests")
    .select(
      `id, name, is_active,
       events!inner (
         title, host_name, event_date, timezone, location_name,
         location_url, dress_code, description, rsvp_deadline
       ),
       rsvps ( status, message, updated_at )`,
    )
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) {
    logServerEvent("invitation_lookup_failed", { code: error.code ?? "unknown" });
    return null;
  }
  if (!data || !data.is_active) return null;

  const eventRow = (Array.isArray(data.events) ? data.events[0] : data.events) as
    | InvitationView["event"]
    | undefined;
  if (!eventRow) return null;

  const rsvpRow = (Array.isArray(data.rsvps) ? data.rsvps[0] : data.rsvps) as
    | { status: RsvpStatus; message: string | null; updated_at: string }
    | null
    | undefined;

  return {
    guest: { id: data.id as string, name: data.name as string },
    event: eventRow,
    rsvp: rsvpRow ?? null,
    deadline_passed: isDeadlinePassed(eventRow.rsvp_deadline),
  };
}

export type SubmitRsvpCode =
  | "ok"
  | "invalid_token"
  | "deadline_passed"
  | "password_required"
  | "server_error";

export interface SubmitRsvpResult {
  code: SubmitRsvpCode;
  rsvp: { status: RsvpStatus; message: string | null; updated_at: string } | null;
}

/**
 * Menyimpan RSVP lewat RPC `submit_rsvp` (SECURITY DEFINER).
 *
 * Validasi token aktif dan deadline dilakukan ULANG di dalam transaksi database
 * yang sama dengan penulisan, dengan row lock pada guest. Jadi klik ganda,
 * request paralel, atau rotasi/nonaktifkan link yang terjadi bersamaan tidak
 * bisa menyelipkan tulisan yang seharusnya ditolak, dan tidak membuat RSVP
 * ganda (constraint UNIQUE pada guest_id + upsert atomik).
 *
 * `passwordVerified` hanya boleh true setelah server memverifikasi password
 * terhadap INVITE_PASSWORD_HASH. RPC menolak status `attending` bila flag ini
 * false, sehingga bypass endpoint langsung tetap gagal.
 */
export async function submitRsvp(params: {
  token: string;
  status: RsvpStatus;
  message: string | null;
  passwordVerified: boolean;
}): Promise<SubmitRsvpResult> {
  if (!isTokenShapeValid(params.token)) {
    return { code: "invalid_token", rsvp: null };
  }

  const { data, error } = await getServiceClient().rpc("submit_rsvp", {
    p_token_hash: hashToken(params.token),
    p_status: params.status,
    p_message: params.message,
    p_password_verified: params.passwordVerified,
  });

  if (error) {
    logServerEvent("submit_rsvp_failed", { code: error.code ?? "unknown" });
    return { code: "server_error", rsvp: null };
  }

  const payload = (data ?? {}) as {
    code?: SubmitRsvpCode;
    status?: RsvpStatus;
    message?: string | null;
    updated_at?: string;
  };

  const code: SubmitRsvpCode = payload.code ?? "server_error";
  if (code !== "ok" || !payload.status || !payload.updated_at) {
    return { code, rsvp: null };
  }

  return {
    code: "ok",
    rsvp: {
      status: payload.status,
      message: payload.message ?? null,
      updated_at: payload.updated_at,
    },
  };
}

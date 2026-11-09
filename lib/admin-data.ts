import "server-only";
import { getServiceClient } from "./supabase/admin";
import { generateToken, hashToken } from "./tokens";
import type { EventRecord, GuestSummaryRow, RsvpStatus } from "./types";
import type { EventSettingsInput } from "./validation";
import { logServerEvent } from "./http";

/** Acara MVP tunggal: baris events paling awal. */
export async function getPrimaryEvent(): Promise<EventRecord | null> {
  const { data, error } = await getServiceClient()
    .from("events")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    logServerEvent("event_load_failed", { code: error.code ?? "unknown" });
    return null;
  }
  return (data as EventRecord | null) ?? null;
}

export interface GuestListResult {
  guests: GuestSummaryRow[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    attending: number;
    maybe: number;
    declined: number;
  };
}

export async function listGuests(eventId: string): Promise<GuestListResult> {
  const { data, error } = await getServiceClient()
    .from("guests")
    .select("id, name, is_active, created_at, rsvps ( status, message, responded_at, updated_at )")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    logServerEvent("guest_list_failed", { code: error.code ?? "unknown" });
    throw new Error("Gagal memuat daftar tamu.");
  }

  const guests: GuestSummaryRow[] = (data ?? []).map((row) => {
    const rsvp = (Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps) as
      | { status: RsvpStatus; message: string | null; responded_at: string; updated_at: string }
      | null
      | undefined;
    return {
      id: row.id as string,
      name: row.name as string,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      status: rsvp?.status ?? null,
      message: rsvp?.message ?? null,
      responded_at: rsvp?.responded_at ?? null,
      updated_at: rsvp?.updated_at ?? null,
    };
  });

  return {
    guests,
    summary: {
      total: guests.length,
      active: guests.filter((g) => g.is_active).length,
      inactive: guests.filter((g) => !g.is_active).length,
      pending: guests.filter((g) => g.status === null).length,
      attending: guests.filter((g) => g.status === "attending").length,
      maybe: guests.filter((g) => g.status === "maybe").length,
      declined: guests.filter((g) => g.status === "declined").length,
    },
  };
}

/**
 * Membuat tamu baru dengan token segar.
 *
 * Token mentah dikembalikan SEKALI di sini dan tidak pernah disimpan, sehingga
 * tombol "copy" hanya tersedia pada hasil pembuatan/rotasi. Nama duplikat
 * diizinkan karena dua orang bisa bernama sama.
 */
export async function createGuest(
  eventId: string,
  name: string,
): Promise<{ id: string; token: string }> {
  const service = getServiceClient();

  // Tabrakan token 256-bit praktis tidak mungkin; retry hanya jaring pengaman.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateToken();
    const { data, error } = await service
      .from("guests")
      .insert({ event_id: eventId, name, token_hash: hashToken(token) })
      .select("id")
      .single();

    if (!error && data) return { id: data.id as string, token };
    if (error && error.code !== "23505") {
      logServerEvent("guest_create_failed", { code: error.code ?? "unknown" });
      throw new Error("Gagal menyimpan tamu.");
    }
  }
  throw new Error("Gagal membuat token unik. Coba lagi.");
}

/**
 * Rotasi token: link lama langsung tidak berlaku, sedangkan tamu dan RSVP yang
 * sudah ada dipertahankan.
 */
export async function rotateGuestToken(
  eventId: string,
  guestId: string,
): Promise<{ token: string } | null> {
  const service = getServiceClient();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateToken();
    const { data, error } = await service
      .from("guests")
      .update({ token_hash: hashToken(token) })
      .eq("id", guestId)
      .eq("event_id", eventId)
      .select("id")
      .maybeSingle();

    if (!error && data) return { token };
    if (!error && !data) return null; // guest tidak ada di acara ini
    if (error && error.code !== "23505") {
      logServerEvent("guest_rotate_failed", { code: error.code ?? "unknown" });
      throw new Error("Gagal membuat ulang link.");
    }
  }
  throw new Error("Gagal membuat token unik. Coba lagi.");
}

/** Mengaktifkan/menonaktifkan link. Riwayat RSVP tetap tersimpan. */
export async function setGuestActive(
  eventId: string,
  guestId: string,
  isActive: boolean,
): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .from("guests")
    .update({ is_active: isActive })
    .eq("id", guestId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    logServerEvent("guest_set_active_failed", { code: error.code ?? "unknown" });
    throw new Error("Gagal mengubah status undangan.");
  }
  return Boolean(data);
}

export async function updateEvent(
  eventId: string,
  input: EventSettingsInput,
): Promise<EventRecord> {
  const { data, error } = await getServiceClient()
    .from("events")
    .update({
      title: input.title,
      host_name: input.host_name,
      timezone: input.timezone,
      event_date: input.event_date,
      location_name: input.location_name,
      location_url: input.location_url,
      dress_code: input.dress_code,
      description: input.description,
      rsvp_deadline: input.rsvp_deadline,
    })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) {
    logServerEvent("event_update_failed", { code: error.code ?? "unknown" });
    // 23514 = check constraint, mis. deadline sesudah waktu mulai acara.
    throw new Error(
      error.code === "23514"
        ? "Nilai ditolak database. Pastikan batas RSVP tidak melewati waktu mulai acara."
        : "Gagal menyimpan pengaturan acara.",
    );
  }
  return data as EventRecord;
}

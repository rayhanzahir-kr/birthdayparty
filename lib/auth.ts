import "server-only";
import { createSupabaseServerClient } from "./supabase/server";
import { getServiceClient, isServiceClientConfigured } from "./supabase/admin";

export interface AdminIdentity {
  userId: string;
  email: string | null;
}

export type AdminAuthResult =
  | { ok: true; admin: AdminIdentity }
  | { ok: false; reason: "not_configured" | "unauthenticated" | "forbidden" };

/**
 * Verifikasi admin dua langkah, dijalankan ulang pada SETIAP operasi data —
 * bukan hanya saat halaman dibuka:
 *   1. Sesi Supabase diverifikasi di server lewat getUser().
 *   2. user_id harus ada di allowlist `admin_users`, yang tidak dapat ditulis
 *      pengguna biasa (RLS tanpa policy insert + revoke).
 *
 * Menyembunyikan UI atau middleware saja tidak dianggap perlindungan.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  if (!isServiceClientConfigured()) return { ok: false, reason: "not_configured" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, reason: "unauthenticated" };

  const service = getServiceClient();
  const { data: allowlisted, error: allowlistError } = await service
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (allowlistError || !allowlisted) return { ok: false, reason: "forbidden" };

  return { ok: true, admin: { userId: data.user.id, email: data.user.email ?? null } };
}

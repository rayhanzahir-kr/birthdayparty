import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv, getServiceRoleKey } from "../env";

/**
 * Klien service-role. HANYA untuk modul server, dan HANYA dipanggil setelah
 * otorisasi dilakukan (token undangan valid, atau sesi admin terverifikasi).
 *
 * `import "server-only"` membuat build gagal bila modul ini bocor ke client.
 */
let cached: SupabaseClient | null = null;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set SUPABASE_URL, " +
        "SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export function isServiceClientConfigured(): boolean {
  return getPublicEnv() !== null && typeof getServiceRoleKey() === "string";
}

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const publicEnv = getPublicEnv();
  const serviceKey = getServiceRoleKey();
  if (!publicEnv || !serviceKey) throw new SupabaseNotConfiguredError();

  cached = createClient(publicEnv.supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "birthday-protocol-server" } },
  });
  return cached;
}

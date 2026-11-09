"use client";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Klien browser hanya memakai publishable (anon) key. RLS memastikan key ini
 * tidak bisa membaca data tamu/RSVP. Dipakai khusus untuk login admin.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

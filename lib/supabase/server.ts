import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "../env";

/**
 * Klien Supabase terikat cookie sesi admin. Dipakai untuk memverifikasi sesi
 * di server (getUser melakukan validasi ke Supabase Auth, bukan hanya membaca
 * cookie).
 */
export async function createSupabaseServerClient() {
  const publicEnv = getPublicEnv();
  if (!publicEnv) return null;

  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
            });
          }
        } catch {
          // Dipanggil dari Server Component tanpa izin menulis cookie.
          // Refresh token ditangani route handler / middleware.
        }
      },
    },
  });
}

/**
 * Akses environment terpusat — SEMUANYA dibaca di server.
 *
 * Tidak ada satu pun variabel di sini yang perlu prefix NEXT_PUBLIC: browser
 * tidak pernah berbicara langsung ke Supabase (login admin lewat route server
 * /api/admin/login), sehingga URL dan publishable key tidak perlu ikut ke
 * bundle. Nama tanpa prefix lebih aman karena Next.js tidak akan menyuntikkan
 * nilainya ke JavaScript sisi klien walau nanti ada yang keliru mengimpornya.
 *
 * Nama berprefix NEXT_PUBLIC_ masih dibaca sebagai cadangan agar konfigurasi
 * lama tetap jalan tanpa perubahan.
 */

export interface PublicEnv {
  supabaseUrl: string;
  supabasePublishableKey: string;
  siteUrl: string;
}

function read(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/** Konfigurasi publik Supabase; `null` berarti aplikasi belum dikonfigurasi. */
export function getPublicEnv(): PublicEnv | null {
  const supabaseUrl = read("SUPABASE_URL") ?? read("NEXT_PUBLIC_SUPABASE_URL");
  const supabasePublishableKey =
    read("SUPABASE_PUBLISHABLE_KEY") ??
    read("SUPABASE_ANON_KEY") ??
    read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabasePublishableKey) return null;
  return { supabaseUrl, supabasePublishableKey, siteUrl: getSiteUrl() };
}

export function isSupabaseConfigured(): boolean {
  return getPublicEnv() !== null;
}

/** Service role / secret key. HANYA boleh dipakai dari modul server. */
export function getServiceRoleKey(): string | undefined {
  return read("SUPABASE_SERVICE_ROLE_KEY") ?? read("SUPABASE_SECRET_KEY");
}

/** Hash SHA-256 bentuk kanonis kunci "ikut acara". Server-only. */
export function getInvitePasswordHash(): string | undefined {
  return read("INVITE_PASSWORD_HASH");
}

export function isInvitePasswordConfigured(): boolean {
  const hash = getInvitePasswordHash();
  return typeof hash === "string" && /^[0-9a-f]{64}$/i.test(hash);
}

export function getSiteUrl(): string {
  const explicit = read("SITE_URL") ?? read("NEXT_PUBLIC_SITE_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = read("VERCEL_PROJECT_PRODUCTION_URL") ?? read("VERCEL_URL");
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

/** Daftar origin yang diizinkan melakukan mutasi (proteksi CSRF). */
export function getAllowedOrigins(): string[] {
  const origins = new Set<string>();
  origins.add(getSiteUrl());
  const vercelUrl = read("VERCEL_URL");
  if (vercelUrl) origins.add(`https://${vercelUrl}`);
  const branchUrl = read("VERCEL_BRANCH_URL");
  if (branchUrl) origins.add(`https://${branchUrl}`);
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  const extra = read("ADDITIONAL_ALLOWED_ORIGINS");
  if (extra) {
    for (const item of extra.split(",")) {
      const trimmed = item.trim().replace(/\/+$/, "");
      if (trimmed.length > 0) origins.add(trimmed);
    }
  }
  return [...origins];
}

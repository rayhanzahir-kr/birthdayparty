/**
 * Keputusan proteksi CSRF, dipisah dari Next.js supaya bisa diuji langsung.
 *
 * Urutan penilaian:
 *
 *  1. `Sec-Fetch-Site` adalah header METADATA yang diisi BROWSER, bukan oleh
 *     JavaScript halaman. Situs penyerang tidak dapat memalsukannya. Jadi:
 *       - `cross-site` / `same-site` -> tolak (ini bentuk serangan CSRF).
 *       - `same-origin` -> TERIMA. Browser sudah menjamin request berasal dari
 *         halaman kita sendiri, sehingga tidak perlu lagi mencocokkan dengan
 *         SITE_URL. Ini membuat domain preview, domain kustom, dan salah ketik
 *         konfigurasi tidak melumpuhkan aplikasi — tanpa melemahkan proteksi.
 *       - `none` -> navigasi yang diketik langsung; lanjut ke pemeriksaan Origin.
 *
 *  2. Browser lama tanpa `Sec-Fetch-Site`: jatuh ke allowlist `Origin`, lalu
 *     `Referer`.
 *
 *  3. Tanpa petunjuk apa pun -> tolak.
 */

export type OriginDecision =
  | { allowed: true; reason: "sec_fetch_same_origin" | "origin_allowlisted" | "referer_allowlisted" }
  | { allowed: false; reason: "sec_fetch_cross_site" | "origin_not_allowlisted" | "no_signal" };

export interface OriginSignals {
  secFetchSite: string | null;
  origin: string | null;
  referer: string | null;
}

export function evaluateOrigin(signals: OriginSignals, allowedOrigins: string[]): OriginDecision {
  const { secFetchSite, origin, referer } = signals;

  if (secFetchSite) {
    if (secFetchSite === "same-origin") {
      return { allowed: true, reason: "sec_fetch_same_origin" };
    }
    if (secFetchSite !== "none") {
      // cross-site atau same-site: ditolak.
      return { allowed: false, reason: "sec_fetch_cross_site" };
    }
  }

  if (origin) {
    return allowedOrigins.some((candidate) => isSameOrigin(candidate, origin))
      ? { allowed: true, reason: "origin_allowlisted" }
      : { allowed: false, reason: "origin_not_allowlisted" };
  }

  if (referer) {
    let refererOrigin: string;
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      return { allowed: false, reason: "origin_not_allowlisted" };
    }
    return allowedOrigins.some((candidate) => isSameOrigin(candidate, refererOrigin))
      ? { allowed: true, reason: "referer_allowlisted" }
      : { allowed: false, reason: "origin_not_allowlisted" };
  }

  // `Sec-Fetch-Site: none` tanpa Origin/Referer: navigasi langsung, bukan CSRF.
  if (secFetchSite === "none") return { allowed: true, reason: "sec_fetch_same_origin" };

  return { allowed: false, reason: "no_signal" };
}

export function isSameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

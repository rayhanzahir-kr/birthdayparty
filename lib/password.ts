import { createHash } from "node:crypto";
import { safeCompareHex } from "./tokens";
import { canonicalizeInvitePassword } from "./password-format";

/**
 * Verifikasi kunci konfirmasi "ikut acara" — SERVER ONLY.
 *
 * Catatan keamanan (PRD §4.6): nilai sebenarnya TIDAK pernah ada di source ini,
 * di client bundle, HTML, default input, log, maupun env NEXT_PUBLIC. Server
 * hanya membandingkan hash dari bentuk kanonis terhadap INVITE_PASSWORD_HASH.
 * Ini kunci konfirmasi bersama, bukan verifikasi identitas.
 *
 * Modul ini tidak boleh diimpor komponen client. Impor `node:crypto` di atas
 * adalah penghalang build-time-nya: bundler browser Next gagal mengompilasi
 * skema "node:", sehingga kebocoran langsung terlihat sebagai build error.
 * (Marker `server-only` tidak dipakai di sini agar modul tetap bisa diuji
 * langsung oleh test runner Node; modul server lain memakainya.)
 * Label dan petunjuk format yang dibutuhkan UI ada di lib/password-format.ts.
 */

/** SHA-256 hex dari bentuk kanonis. Dipakai juga oleh scripts/hash-password.mjs. */
export function hashCanonicalPassword(canonical: string): string {
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export type PasswordCheck =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid_format" | "mismatch" };

/**
 * Memverifikasi password tamu terhadap hash yang dikonfigurasi.
 *
 * `expectedHash` harus berasal dari env server-only. Bila belum dikonfigurasi,
 * hasilnya `not_configured` dan pemanggil WAJIB menolak penyimpanan attending —
 * tidak boleh memalsukan keberhasilan (PRD §11).
 */
export function verifyInvitePassword(raw: unknown, expectedHash: string | undefined): PasswordCheck {
  const normalizedExpected =
    typeof expectedHash === "string" ? expectedHash.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{64}$/.test(normalizedExpected)) {
    return { ok: false, reason: "not_configured" };
  }

  const canonical = canonicalizeInvitePassword(raw);
  if (canonical === null) {
    return { ok: false, reason: "invalid_format" };
  }

  return safeCompareHex(hashCanonicalPassword(canonical), normalizedExpected)
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}

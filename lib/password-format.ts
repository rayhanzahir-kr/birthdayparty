/**
 * Bentuk & normalisasi kunci "ikut acara" — lapisan yang AMAN untuk client.
 *
 * Modul ini sengaja tidak memuat node:crypto dan tidak tahu hash apa pun,
 * sehingga boleh diimpor komponen browser untuk label/petunjuk format dan
 * pemeriksaan bentuk. Verifikasi sesungguhnya ada di lib/password.ts yang
 * server-only. Nilai password TIDAK pernah ada di modul ini.
 */

/** Petunjuk format yang boleh tampil di UI. Tidak mengandung jawaban. */
export const PASSWORD_HINT = "DDMMYYYY (dots or dashes also work)";
export const PASSWORD_LABEL = "Key to join: my birthday";

/** Batas panjang input mentah supaya payload tidak bisa dibesar-besarkan. */
export const PASSWORD_MAX_RAW_LENGTH = 32;

/**
 * Bentuk yang diterima.
 *
 * PLAIN (DDMMYYYY) adalah format utama yang ditampilkan ke tamu, sejalan dengan
 * jawaban game Level 3 — supaya tamu tidak belajar satu format lalu ditolak di
 * form RSVP.
 *
 * Bentuk bertanda pemisah tetap diterima agar petunjuk lama yang sudah beredar
 * tidak rusak. Separator tetap harus KONSISTEN: titik semua atau tanda hubung
 * semua. Campuran tetap ditolak.
 */
const PLAIN_PATTERN = /^(\d{2})(\d{2})(\d{4})$/;
const DOT_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const DASH_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

function isRealCalendarDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  // Date.UTC menormalkan tanggal berlebih, jadi kita bandingkan kembali.
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Menormalkan input tamu ke `YYYY-MM-DD`.
 *
 * Diterima: tepat dua digit hari, dua digit bulan, empat digit tahun — tanpa
 * pemisah (DDMMYYYY), atau dengan separator titik ATAU tanda hubung yang
 * konsisten, setelah trim spasi luar.
 *
 * Bentuk kanonis TIDAK berubah, sehingga INVITE_PASSWORD_HASH yang sudah
 * dikonfigurasi tetap berlaku dan tidak perlu dibuat ulang.
 * Ditolak: separator campuran (10.11-2004), format lain (2004-11-10, 10/11/2004),
 * satu digit (1.1.2004), spasi di tengah, dan tanggal kalender tidak valid.
 *
 * @returns bentuk kanonis, atau null bila input tidak memenuhi aturan.
 */
export function canonicalizeInvitePassword(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length > PASSWORD_MAX_RAW_LENGTH) return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const match =
    PLAIN_PATTERN.exec(trimmed) ?? DOT_PATTERN.exec(trimmed) ?? DASH_PATTERN.exec(trimmed);
  if (!match) return null;

  const [, dd, mm, yyyy] = match as unknown as [string, string, string, string];
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);

  if (!isRealCalendarDate(day, month, year)) return null;

  return `${yyyy}-${mm}-${dd}`;
}

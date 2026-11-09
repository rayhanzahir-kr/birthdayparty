/**
 * Level 3 — validasi jawaban tanggal lahir.
 *
 * PENTING (PRD §05, batas keamanan): ini JAWABAN GAME, bukan kredensial.
 * Modul ini tidak melakukan autentikasi, tidak menyentuh token undangan, dan
 * tidak boleh dipakai untuk otorisasi apa pun. Perbandingannya sengaja dilakukan
 * di client sebagai teks biasa — tidak ada backend baru untuk menyembunyikan
 * jawaban, karena jawabannya memang tidak rahasia.
 *
 * Nilai input tamu TIDAK pernah disimpan atau di-log, termasuk tebakan salah.
 */

/** Jawaban kanonis, format DDMMYYYY (delapan digit, tanpa pemisah). */
export const CANONICAL_BIRTHDAY = "10112004";

/** Label format yang ditampilkan ke tamu. */
export const BIRTHDAY_FORMAT_LABEL = "DDMMYYYY";

/** Batas panjang input (PRD FR-04a). */
export const BIRTHDAY_MAX_LENGTH = 32;

/**
 * Bentuk bertanda pemisah yang tetap DITERIMA.
 *
 * Penyimpangan sadar dari PRD §FR-04a, atas permintaan pemilik produk: format
 * utama kini DDMMYYYY, dan ketiga alias di bawah diterima secara DEFAULT supaya
 * tamu tidak pernah tertahan hanya karena menambahkan titik atau garis.
 * Tetap tidak ada pembuangan karakter non-digit secara umum — hanya pola persis
 * ini yang dikenali.
 */
const ACCEPTED_ALIASES: Record<string, string> = {
  "10.11.2004": CANONICAL_BIRTHDAY,
  "10-11-2004": CANONICAL_BIRTHDAY,
  "10/11/2004": CANONICAL_BIRTHDAY,
};

export interface BirthdayCheckOptions {
  /**
   * Dipertahankan demi kompatibilitas pemanggil lama. Alias bertanda pemisah
   * kini selalu diterima, jadi opsi ini tidak lagi mengubah perilaku.
   */
  acceptBirthdayVariants?: boolean;
}

export type BirthdayVerdict =
  /** Input kosong: tampilkan petunjuk format, JANGAN dihitung sebagai tebakan salah. */
  | { kind: "empty" }
  | { kind: "correct"; normalized: string }
  | { kind: "incorrect" };

/**
 * Memeriksa jawaban Level 3.
 *
 * Trim whitespace di kedua ujung. Menerima bentuk kanonis `10112004` serta tiga
 * alias bertanda pemisah. Semua selain itu salah, termasuk tanggal terbalik,
 * tahun dua digit, format ISO, dan teks tambahan.
 */
export function checkBirthdayAnswer(
  raw: unknown,
  _options: BirthdayCheckOptions = {},
): BirthdayVerdict {
  if (typeof raw !== "string") return { kind: "incorrect" };
  if (raw.length > BIRTHDAY_MAX_LENGTH) return { kind: "incorrect" };

  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: "empty" };

  if (trimmed === CANONICAL_BIRTHDAY) {
    return { kind: "correct", normalized: CANONICAL_BIRTHDAY };
  }

  const alias = ACCEPTED_ALIASES[trimmed];
  if (alias) return { kind: "correct", normalized: alias };

  return { kind: "incorrect" };
}

/** Pesan ACCESS DENIED, dirotasi deterministik agar mudah diuji (PRD FR-04b). */
export const DENIED_MESSAGES = [
  "Seriously? You don't even know my birthday? And you call yourself my friend?",
  "Wrong date. The birthday cake has filed a complaint.",
  "That date belongs to a different legend. Try again.",
] as const;

/** @param failedAttempts jumlah tebakan non-kosong yang sudah gagal, mulai 1. */
export function deniedMessageFor(failedAttempts: number): string {
  const index = (Math.max(1, failedAttempts) - 1) % DENIED_MESSAGES.length;
  return DENIED_MESSAGES[index] as string;
}

/** Petunjuk tambahan muncul SETELAH dua tebakan non-kosong yang gagal. */
export const EXTRA_HINT = "November 10, 2004. Yes, this is basically the answer.";

export function shouldShowExtraHint(failedAttempts: number): boolean {
  return failedAttempts >= 2;
}

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 byte = 256 bit entropi, jauh di atas minimum 128 bit pada PRD §7. */
export const TOKEN_BYTES = 32;

/** Panjang string base64url dari 32 byte tanpa padding. */
export const TOKEN_LENGTH = 43;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Membuat token undangan mentah. Nilai ini hanya dikembalikan satu kali saat
 * generate/rotate dan tidak pernah disimpan dalam bentuk plaintext.
 */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** Bentuk token valid secara sintaks. Dipakai sebelum query database. */
export function isTokenShapeValid(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

/**
 * Token berentropi tinggi, jadi SHA-256 cukup dan tidak perlu password hashing
 * yang mahal (PRD §7). Hash dipakai sebagai lookup key UNIQUE di database.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const HEX_PATTERN = /^[0-9a-f]+$/i;

/**
 * Perbandingan hash hex dengan waktu konstan.
 *
 * Bentuk hex divalidasi lebih dulu: `Buffer.from(nilaiNonHex, "hex")` berhenti
 * pada karakter tidak valid dan bisa menghasilkan buffer kosong, sehingga dua
 * string non-hex yang sama panjang akan dianggap sama oleh timingSafeEqual.
 */
export function safeCompareHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length || a.length === 0) return false;
  if (a.length % 2 !== 0) return false;
  if (!HEX_PATTERN.test(a) || !HEX_PATTERN.test(b)) return false;
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length === 0 || left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/** Membentuk URL undangan absolut dari base URL situs. */
export function buildInviteUrl(siteUrl: string, token: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  return `${base}/invite/${token}`;
}

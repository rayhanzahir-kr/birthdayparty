import "server-only";
import { createHash } from "node:crypto";

/**
 * ID tampilan untuk kartu VIP dan namespace penyimpanan lokal.
 *
 * Keputusan desain (PRD FR-06): PRD meminta ID publik yang aman, dan melarang
 * menampilkan ID database mentah atau bagian token. Aplikasi ini belum punya ID
 * publik, dan PRD juga melarang mengarang environment variable baru untuk HMAC.
 *
 * Jalan tengah yang dipakai: SHA-256 dari UUID guest, dipotong 12 hex.
 * UUID v4 punya ~122 bit entropi acak, sehingga hash-nya tidak dapat ditebak
 * balik tanpa mengetahui UUID-nya — jadi tidak perlu secret tambahan, dan tidak
 * ada env var baru yang diciptakan.
 *
 * Batasnya jujur: nilai ini STABIL dan karenanya LINKABLE antar sesi. Ia bukan
 * rahasia dan bukan otorisasi; jangan pernah dipakai sebagai izin akses, dan
 * jangan dikirim ke log atau analitik.
 *
 * Dihitung di server dan dikirim sebagai prop; UUID internal tidak pernah
 * sampai ke browser. Marker `server-only` membuat build GAGAL bila modul ini
 * ikut ke bundle client — pemformatannya ada di display-id-format.ts.
 */
export function deriveDisplayId(guestId: string): string {
  return createHash("sha256").update(`project-r:display:${guestId}`, "utf8")
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
}

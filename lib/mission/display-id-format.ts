/**
 * Pemformatan display ID — lapisan yang AMAN untuk client.
 *
 * Sengaja tidak memuat node:crypto, sehingga boleh diimpor komponen browser.
 * Penurunan ID-nya sendiri ada di lib/mission/display-id.ts (server-only).
 */

/** Format untuk ditampilkan di kartu, mis. "R-4F2A-9C11". */
export function formatDisplayId(displayId: string): string {
  const id = displayId.toUpperCase();
  return `R-${id.slice(0, 4)}-${id.slice(4, 8)}`;
}

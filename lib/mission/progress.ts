/**
 * Persistensi progress mission — localStorage dengan fallback in-memory.
 *
 * Yang DISIMPAN hanya: versi skema, level berikutnya, flag completed/skipped,
 * dan timestamp. Nama tamu, token mentah, input tanggal lahir, dan RSVP TIDAK
 * pernah disimpan (PRD FR-10).
 *
 * Namespace memakai displayId — turunan hash dari identitas internal, bukan
 * rahasia, tetapi tetap diperlakukan sebagai data linkable: tidak pernah
 * di-log, dikirim ke analitik, atau dipakai sebagai otorisasi.
 */

export const PROGRESS_SCHEMA_VERSION = 1;
export const PROGRESS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export interface MissionProgress {
  version: number;
  nextLevel: number;
  completed: boolean;
  skipped: boolean;
  updatedAt: number;
}

export function storageKey(displayId: string): string {
  return `project-r:v${PROGRESS_SCHEMA_VERSION}:${displayId}`;
}

/** Fallback ketika localStorage ditolak (private mode, kuota, izin). */
const memoryStore = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // localStorage diblokir; pakai memori.
  }
  return memoryStore.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    return;
  } catch {
    // Kuota/izin ditolak: jangan sampai menghalangi undangan.
  }
  memoryStore.set(key, value);
}

function removeRaw(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // abaikan
  }
  memoryStore.delete(key);
}

/**
 * Validasi ketat saat restore. Data rusak, versi tak dikenal, level di luar
 * rentang, atau timestamp tidak masuk akal => dianggap tidak ada, dan key
 * AKTIF saja yang dibersihkan (tidak pernah menghapus localStorage lain).
 */
export function parseProgress(raw: string | null, now: number = Date.now()): MissionProgress | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const p = parsed as Record<string, unknown>;
  if (p.version !== PROGRESS_SCHEMA_VERSION) return null;

  const nextLevel = p.nextLevel;
  if (typeof nextLevel !== "number" || !Number.isInteger(nextLevel) || nextLevel < 1 || nextLevel > 4) {
    return null;
  }
  if (typeof p.completed !== "boolean" || typeof p.skipped !== "boolean") return null;

  const updatedAt = p.updatedAt;
  if (typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) return null;
  // Timestamp masa depan yang tidak masuk akal, atau sudah kedaluwarsa.
  if (updatedAt > now + 60_000) return null;
  if (now - updatedAt > PROGRESS_TTL_MS) return null;

  return {
    version: PROGRESS_SCHEMA_VERSION,
    nextLevel,
    completed: p.completed,
    skipped: p.skipped,
    updatedAt,
  };
}

export function loadProgress(displayId: string, now: number = Date.now()): MissionProgress | null {
  if (typeof window === "undefined") return null;
  const key = storageKey(displayId);
  const progress = parseProgress(readRaw(key), now);
  if (progress === null) removeRaw(key); // bersihkan HANYA key aktif
  return progress;
}

export function saveProgress(
  displayId: string,
  value: { nextLevel: number; completed: boolean; skipped: boolean },
  now: number = Date.now(),
): void {
  if (typeof window === "undefined") return;
  const payload: MissionProgress = {
    version: PROGRESS_SCHEMA_VERSION,
    nextLevel: Math.min(4, Math.max(1, Math.floor(value.nextLevel))),
    completed: value.completed,
    skipped: value.skipped,
    updatedAt: now,
  };
  writeRaw(storageKey(displayId), JSON.stringify(payload));
}

/** Replay: hapus state mission undangan AKTIF saja. */
export function clearProgress(displayId: string): void {
  if (typeof window === "undefined") return;
  removeRaw(storageKey(displayId));
}

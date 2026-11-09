/**
 * State machine mission — fungsi murni, tanpa efek samping, agar bisa diuji.
 *
 * Catatan arsitektur: status `loading`, `invalid`, dan `lookupError` dari PRD
 * ditangani di SERVER (app/invite/[token]/page.tsx) karena resolver undangan
 * memang server-side. Halaman hanya dirender setelah token valid, jadi state
 * machine client ini tidak pernah memegang keputusan akses.
 *
 * INVARIAN: state di sini murni preferensi pengalaman. Tidak pernah menjadi
 * izin akses maupun bukti RSVP.
 */

export type MissionStage = "boot" | "intro" | "challenge" | "card" | "invitation";

export interface MissionState {
  stage: MissionStage;
  /** 1..4, hanya bermakna saat stage === "challenge". */
  level: number;
  completed: boolean;
  skipped: boolean;
}

export type MissionAction =
  /** Memulihkan state dari progress tersimpan (sekali, saat mount). */
  | { type: "RESTORE"; state: MissionState }
  | { type: "BOOT_DONE" }
  | { type: "SKIP_ANIMATION" }
  | { type: "START_MISSION" }
  | { type: "CHALLENGE_PASSED"; level: number }
  | { type: "SKIP_MISSION" }
  | { type: "VIEW_CARD" }
  | { type: "CONTINUE_TO_INVITATION" }
  | { type: "REPLAY" };

export const TOTAL_LEVELS = 4;

export function initialState(): MissionState {
  return { stage: "boot", level: 1, completed: false, skipped: false };
}

/**
 * Membangun state awal untuk kunjungan ulang berdasarkan progress tersimpan.
 * Tidak pernah memaksa boot/game ulang untuk tamu yang sudah selesai.
 */
export function stateFromProgress(progress: {
  nextLevel: number;
  completed: boolean;
  skipped: boolean;
} | null): MissionState {
  if (!progress) return initialState();

  // Selesai: langsung ke pilihan utama (undangan), kartu tetap bisa dibuka.
  if (progress.completed) {
    return { stage: "invitation", level: TOTAL_LEVELS, completed: true, skipped: false };
  }
  // Skip dan completed adalah status BERBEDA.
  if (progress.skipped) {
    return { stage: "invitation", level: clampLevel(progress.nextLevel), completed: false, skipped: true };
  }
  // Belum selesai: resume dari level pertama yang belum lewat.
  return { stage: "challenge", level: clampLevel(progress.nextLevel), completed: false, skipped: false };
}

export function missionReducer(state: MissionState, action: MissionAction): MissionState {
  switch (action.type) {
    case "RESTORE":
      return action.state;

    case "BOOT_DONE":
    case "SKIP_ANIMATION":
      // Hanya bermakna selama boot; diabaikan bila sudah lewat.
      return state.stage === "boot" ? { ...state, stage: "intro" } : state;

    case "START_MISSION":
      // Dari intro, atau dari layar undangan untuk tamu yang pernah skip.
      if (state.stage === "intro" || state.stage === "invitation") {
        return { ...state, stage: "challenge", level: clampLevel(state.level), skipped: false };
      }
      return state;

    case "CHALLENGE_PASSED": {
      // Proteksi transisi ganda: klik/Enter beruntun untuk level yang sama,
      // atau jawaban dari level yang sudah ditinggalkan, diabaikan.
      if (state.stage !== "challenge") return state;
      if (action.level !== state.level) return state;

      const next = state.level + 1;
      if (next > TOTAL_LEVELS) {
        return { ...state, stage: "card", level: TOTAL_LEVELS, completed: true, skipped: false };
      }
      return { ...state, level: next };
    }

    case "SKIP_MISSION":
      // Tersedia dari stage mana pun. TIDAK menandai completed, dan tidak
      // pernah mengirim RSVP.
      if (state.stage === "invitation") return state;
      return { ...state, stage: "invitation", skipped: !state.completed };

    case "VIEW_CARD":
      // Kartu hanya untuk yang benar-benar menyelesaikan mission.
      return state.completed ? { ...state, stage: "card" } : state;

    case "CONTINUE_TO_INVITATION":
      return { ...state, stage: "invitation" };

    case "REPLAY":
      // Mengulang hanya mereset progress mission undangan aktif.
      return { stage: "challenge", level: 1, completed: false, skipped: false };

    default:
      return state;
  }
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(level)));
}

/** Progress yang harus dipersistensi dari sebuah state. */
export function progressFromState(state: MissionState): {
  nextLevel: number;
  completed: boolean;
  skipped: boolean;
} {
  return {
    nextLevel: state.completed ? TOTAL_LEVELS : clampLevel(state.level),
    completed: state.completed,
    skipped: state.skipped,
  };
}

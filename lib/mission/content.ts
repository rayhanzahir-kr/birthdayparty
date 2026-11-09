/**
 * Satu-satunya definisi konten challenge (PRD NFR-09: single source of truth).
 * Seluruh copy di sini berbahasa Inggris sesuai PRD.
 */

export interface ChoiceOption {
  id: "A" | "B" | "C";
  /** Teks biasa. Dirender sebagai teks, tidak pernah sebagai HTML. */
  label: string;
  /** Ditampilkan dengan gaya monospace (potongan kode). */
  mono?: boolean;
}

export interface ChoiceChallengeSpec {
  level: 1 | 2 | 4;
  kind: "choice";
  heading: string;
  question: string;
  /** Blok kode inert, hanya untuk Level 2. Tidak pernah dieksekusi. */
  code?: string;
  options: ChoiceOption[];
  correct: "A" | "B" | "C";
  success: string;
  incorrect: string;
}

export interface BirthdayChallengeSpec {
  level: 3;
  kind: "birthday";
  heading: string;
  terminalLines: string[];
  hint: string;
  successHeading: string;
  success: string;
}

export type ChallengeSpec = ChoiceChallengeSpec | BirthdayChallengeSpec;

export const TOTAL_LEVELS = 4;

export const LEVEL_1: ChoiceChallengeSpec = {
  level: 1,
  kind: "choice",
  heading: "LEVEL 01 — IDENTITY VERIFICATION",
  question: "Are you emotionally prepared to celebrate Rayhan?",
  options: [
    { id: "A", label: "Obviously. I'm the main character." },
    { id: "B", label: "I have no idea why I'm here." },
    { id: "C", label: "Who is Rayhan?" },
  ],
  correct: "A",
  success: "Identity verified. Your confidence is concerning.",
  incorrect: "Confidence check failed. Try selecting the main-character option.",
};

export const LEVEL_2: ChoiceChallengeSpec = {
  level: 2,
  kind: "choice",
  heading: "LEVEL 02 — JAVA DEBUG CHALLENGE",
  question: "Which statement correctly prints ACCESS GRANTED?",
  code: `public class Birthday {
    public static void main(String[] args) {
        // Complete the invitation
    }
}`,
  options: [
    { id: "A", label: 'print("ACCESS GRANTED");', mono: true },
    { id: "B", label: 'System.out.println("ACCESS GRANTED");', mono: true },
    { id: "C", label: 'console.log("ACCESS GRANTED");', mono: true },
  ],
  correct: "B",
  success: "Compilation successful. Surprisingly competent.",
  incorrect: "Wrong language, right enthusiasm. Try again.",
};

export const LEVEL_3: BirthdayChallengeSpec = {
  level: 3,
  kind: "birthday",
  heading: "LEVEL 03 — BIRTHDAY DATE DECRYPTION",
  terminalLines: [
    "> SECURITY CHECKPOINT 03",
    "> Identity verification required.",
    "> Enter the date the legend was born.",
    "> Format: DDMMYYYY",
  ],
  hint: "The day the world was blessed with my existence",
  successHeading: "ACCESS GRANTED — 10112004 VERIFIED",
  success: "Congratulations. You officially know more about me than I expected.",
};

export const LEVEL_4: ChoiceChallengeSpec = {
  level: 4,
  kind: "choice",
  heading: "LEVEL 04 — FINAL BOSS",
  question: "What happens if you don't attend Rayhan's birthday?",
  options: [
    { id: "A", label: "The server crashes." },
    { id: "B", label: "Rayhan throws a NullPointerException." },
    { id: "C", label: "Nothing. But I'll judge you silently." },
  ],
  correct: "C",
  success: "Congratulations. You have successfully wasted several minutes of your life.",
  incorrect: "The server will survive. Your social reputation is still compiling.",
};

export const CHALLENGES: ChallengeSpec[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4];

export function challengeForLevel(level: number): ChallengeSpec | undefined {
  return CHALLENGES.find((c) => c.level === level);
}

/**
 * Baris boot terminal. Murni teatrikal — TIDAK menyiratkan autentikasi baru.
 * Validasi token sudah terjadi di server sebelum halaman ini dirender.
 * `{guestName}` diganti sebagai teks aman oleh komponen, bukan HTML.
 */
export const BOOT_LINES = [
  "Initializing PROJECT_R...",
  "Establishing secure connection...",
  "Loading birthday protocol...",
  "Authenticating guest token...",
  "Identity detected: {guestName}",
  "Friendship status: VERIFIED",
  "Security clearance: PENDING",
] as const;

export const INTRO_HEADING = "WELCOME TO PROJECT R";
export const INTRO_COPY =
  "Congratulations. Out of 8 billion people, somehow you made it onto my guest list.";
export const INTRO_CTA = "INITIALIZE MISSION";

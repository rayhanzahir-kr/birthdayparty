"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LEVEL_1, LEVEL_2, LEVEL_4 } from "@/lib/mission/content";
import { clearProgress, loadProgress, saveProgress } from "@/lib/mission/progress";
import {
  initialState,
  missionReducer,
  progressFromState,
  stateFromProgress,
} from "@/lib/mission/state";
import { BirthdayChallenge } from "./BirthdayChallenge";
import { ChoiceChallenge } from "./ChoiceChallenge";
import { MissionBoundary } from "./MissionBoundary";
import { MissionIntro } from "./MissionIntro";
import { TerminalBoot } from "./TerminalBoot";
import { VIPAccessCard } from "./VIPAccessCard";

/** useLayoutEffect hanya di browser, agar tidak memicu peringatan saat SSR. */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Pembungkus mission di sekitar undangan yang sudah ada.
 *
 * KONTRAK INTEGRASI (PRD FR-09): komponen ini TIDAK menyentuh RSVP. Undangan
 * asli diterima apa adanya lewat `children` dan dirender tanpa perubahan saat
 * stage mencapai "invitation". Tidak ada form, handler, endpoint, atau payload
 * RSVP yang digandakan di sini, dan tidak ada jalur dari mission yang memanggil
 * mutasi RSVP.
 *
 * Urutan render dipilih agar aman: server merender `children` (undangan), dan
 * mission baru mengambil alih pada layout effect sebelum paint. Dampaknya,
 * tidak ada hydration mismatch, tidak ada kedipan, dan bila JavaScript gagal
 * dimuat tamu tetap mendapat undangan — bukan layar game yang macet.
 */
export function MissionGate({
  guestName,
  displayId,
  eventTitle,
  children,
}: {
  guestName: string;
  displayId: string;
  eventTitle: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [state, dispatch] = useReducer(missionReducer, undefined, initialState);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hydrated = useRef(false);

  // Pulihkan progress sebelum paint pertama.
  useIsomorphicLayoutEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const stored = loadProgress(displayId);
    const restored = stateFromProgress(
      stored ? { nextLevel: stored.nextLevel, completed: stored.completed, skipped: stored.skipped } : null,
    );
    if (restored.stage !== "boot") dispatch({ type: "RESTORE", state: restored });
    setMounted(true);
  }, [displayId]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const listener = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  // Simpan setelah transisi bermakna.
  useEffect(() => {
    if (!mounted) return;
    saveProgress(displayId, progressFromState(state));
  }, [mounted, displayId, state]);

  // Multi-tab: last-write-wins, baca ulang saat tab kembali fokus.
  useEffect(() => {
    if (!mounted) return;
    function onFocus() {
      const stored = loadProgress(displayId);
      if (!stored) return;
      if (stored.completed && !state.completed) {
        dispatch({ type: "RESTORE", state: stateFromProgress(stored) });
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [mounted, displayId, state.completed]);

  const openInvitation = useCallback(() => dispatch({ type: "SKIP_MISSION" }), []);
  const onPassed = useCallback((level: number) => dispatch({ type: "CHALLENGE_PASSED", level }), []);

  const replay = useCallback(() => {
    clearProgress(displayId);
    dispatch({ type: "REPLAY" });
  }, [displayId]);

  // Sebelum mount, dan setiap kali stage adalah invitation, tampilkan undangan
  // asli apa adanya.
  if (!mounted || state.stage === "invitation") {
    return (
      <>
        {mounted && (state.completed || state.skipped) ? (
          <MissionBar
            completed={state.completed}
            onViewCard={() => dispatch({ type: "VIEW_CARD" })}
            onStart={() => dispatch({ type: "START_MISSION" })}
            onReplay={replay}
          />
        ) : null}
        {children}
      </>
    );
  }

  return (
    <div className="project-r">
      <MissionBoundary onOpenInvitation={openInvitation}>
        {state.stage === "boot" ? (
          <TerminalBoot
            guestName={guestName}
            reducedMotion={reducedMotion}
            onDone={() => dispatch({ type: "BOOT_DONE" })}
            onSkipAnimation={() => dispatch({ type: "SKIP_ANIMATION" })}
            onSkipMission={openInvitation}
          />
        ) : null}

        {state.stage === "intro" ? (
          <MissionIntro
            guestName={guestName}
            onStart={() => dispatch({ type: "START_MISSION" })}
            onSkipMission={openInvitation}
          />
        ) : null}

        {state.stage === "challenge" && state.level === 1 ? (
          <ChoiceChallenge spec={LEVEL_1} onPassed={onPassed} onSkipMission={openInvitation} />
        ) : null}
        {state.stage === "challenge" && state.level === 2 ? (
          <ChoiceChallenge spec={LEVEL_2} onPassed={onPassed} onSkipMission={openInvitation} />
        ) : null}
        {state.stage === "challenge" && state.level === 3 ? (
          <BirthdayChallenge onPassed={onPassed} onSkipMission={openInvitation} />
        ) : null}
        {state.stage === "challenge" && state.level === 4 ? (
          <ChoiceChallenge spec={LEVEL_4} onPassed={onPassed} onSkipMission={openInvitation} />
        ) : null}

        {state.stage === "card" ? (
          <VIPAccessCard
            guestName={guestName}
            displayId={displayId}
            eventTitle={eventTitle}
            onContinue={() => dispatch({ type: "CONTINUE_TO_INVITATION" })}
            onReplay={replay}
          />
        ) : null}
      </MissionBoundary>
    </div>
  );
}

/** Bar tipis di atas undangan untuk tamu yang sudah selesai atau pernah skip. */
function MissionBar({
  completed,
  onViewCard,
  onStart,
  onReplay,
}: {
  completed: boolean;
  onViewCard: () => void;
  onStart: () => void;
  onReplay: () => void;
}) {
  return (
    <div className="border-b border-edge bg-void-2/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <p className="label-mono">
          {completed ? "project_r · mission complete" : "project_r · mission skipped"}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          {completed ? (
            <>
              <button type="button" onClick={onViewCard} className={BAR_BUTTON}>
                View VIP Card
              </button>
              <button type="button" onClick={onReplay} className={BAR_BUTTON}>
                Replay
              </button>
            </>
          ) : (
            <button type="button" onClick={onStart} className={BAR_BUTTON}>
              Start Mission
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const BAR_BUTTON =
  "inline-flex min-h-11 items-center rounded-lg border border-edge-bright px-3 font-mono " +
  "text-[0.6875rem] text-ink-muted transition-colors hover:border-cyan-neon hover:text-cyan-neon";

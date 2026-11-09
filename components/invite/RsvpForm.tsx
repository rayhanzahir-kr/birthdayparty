"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CircleHelp, X, Eye, EyeOff, KeyRound, Save, Lock } from "lucide-react";
import { Field, Spinner, buttonClass, cx, inputClass } from "@/components/ui/primitives";
import { MESSAGE_MAX_LENGTH } from "@/lib/validation";
import { PASSWORD_HINT, PASSWORD_LABEL } from "@/lib/password-format";
import { RSVP_STATUS_LABEL, type RsvpStatus } from "@/lib/types";

export interface SavedRsvp {
  status: RsvpStatus;
  message: string | null;
  updated_at: string;
}

interface RsvpFormProps {
  token: string;
  saved: SavedRsvp | null;
  deadlinePassed: boolean;
  onSaved: (rsvp: SavedRsvp) => void;
  /** Mode demo: tidak memanggil API produksi sama sekali. */
  demo?: boolean;
}

const OPTIONS: Array<{
  value: RsvpStatus;
  icon: typeof Check;
  blurb: string;
  accent: string;
}> = [
  {
    value: "attending",
    icon: Check,
    blurb: "Aku datang. Perlu kunci acara.",
    accent: "data-[selected=true]:border-ok data-[selected=true]:bg-ok/12 data-[selected=true]:text-ok",
  },
  {
    value: "maybe",
    icon: CircleHelp,
    blurb: "Masih belum bisa memastikan.",
    accent:
      "data-[selected=true]:border-warn data-[selected=true]:bg-warn/12 data-[selected=true]:text-warn",
  },
  {
    value: "declined",
    icon: X,
    blurb: "Kali ini tidak bisa ikut.",
    accent:
      "data-[selected=true]:border-bad data-[selected=true]:bg-bad/12 data-[selected=true]:text-bad",
  },
];

type Phase = "idle" | "saving" | "saved" | "error";

/**
 * Form RSVP.
 *
 * Perilaku yang dijaga ketat:
 *   * Password HANYA muncul saat memilih "Hadir" (attending). maybe/declined
 *     tidak pernah memintanya.
 *   * Tidak ada nilai password default, tidak ada autofill, dan jawaban tidak
 *     pernah ditulis di UI — hanya petunjuk format.
 *   * Sukses dan animasi merge hanya dijalankan SETELAH server mengonfirmasi.
 *   * Saat gagal (jaringan maupun validasi), pilihan dan pesan dipertahankan
 *     supaya tamu bisa langsung mencoba ulang.
 *   * Setiap submit attending mengirim password lagi — tidak ada sesi unlock.
 */
export function RsvpForm({ token, saved, deadlinePassed, onSaved, demo = false }: RsvpFormProps) {
  const prefersReducedMotion = useReducedMotion();
  const baseId = useId();
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState<RsvpStatus | null>(saved?.status ?? null);
  const [message, setMessage] = useState(saved?.message ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const needsPassword = status === "attending";
  const locked = deadlinePassed;

  // Fokus otomatis ke kolom kunci ketika tamu baru memilih "Hadir".
  useEffect(() => {
    if (needsPassword && phase === "idle" && !locked) {
      passwordInputRef.current?.focus();
    }
  }, [needsPassword, phase, locked]);

  // Mengubah pilihan membuang error lama, tapi TIDAK membuang isian tamu.
  function selectStatus(next: RsvpStatus) {
    if (locked) return;
    setStatus(next);
    setFormError(null);
    setPasswordError(null);
    if (phase === "saved" || phase === "error") setPhase("idle");
    if (next !== "attending") {
      setPassword("");
      setShowPassword(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || phase === "saving") return;

    setFormError(null);
    setPasswordError(null);

    if (status === null) {
      setFormError("Pilih salah satu jawaban dulu.");
      return;
    }
    if (message.length > MESSAGE_MAX_LENGTH) {
      setFormError(`Pesan maksimal ${MESSAGE_MAX_LENGTH} karakter.`);
      return;
    }
    // Pemeriksaan kosong di client hanya untuk UX. Server tetap yang memutuskan.
    if (status === "attending" && password.trim().length === 0) {
      setPasswordError("Isi kunci untuk ikut acara dulu.");
      passwordInputRef.current?.focus();
      return;
    }

    setPhase("saving");

    if (demo) {
      // Demo tidak pernah menyentuh endpoint produksi dan tidak menulis data.
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (status === "attending" && !/^\d{2}([.-])\d{2}\1\d{4}$/.test(password.trim())) {
        setPhase("error");
        setPasswordError("Mode demo: formatnya harus DD.MM.YYYY atau DD-MM-YYYY.");
        return;
      }
      setPhase("saved");
      setPassword("");
      onSaved({ status, message: message.trim() || null, updated_at: new Date().toISOString() });
      return;
    }

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // same-origin agar cookie/Origin konsisten dengan proteksi CSRF server.
        credentials: "same-origin",
        body: JSON.stringify({
          token,
          status,
          message: message.trim(),
          ...(status === "attending" ? { password } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; field?: string | null; rsvp?: SavedRsvp }
        | null;

      if (!response.ok || !payload?.ok || !payload.rsvp) {
        const text = payload?.error ?? "Gagal menyimpan jawaban. Coba lagi.";
        setPhase("error");
        if (payload?.field === "password") {
          setPasswordError(text);
          passwordInputRef.current?.focus();
        } else {
          setFormError(text);
        }
        return; // Isian tetap utuh; tidak ada sukses palsu.
      }

      // Server sudah mengonfirmasi penyimpanan — baru sekarang sukses & merge.
      setPhase("saved");
      setPassword("");
      setShowPassword(false);
      onSaved(payload.rsvp);
    } catch {
      setPhase("error");
      setFormError(
        "Jaringan sedang bermasalah dan jawaban belum tersimpan. Isianmu masih ada, coba simpan lagi.",
      );
    }
  }

  if (locked) {
    return (
      <div className="px-5 pb-5 sm:px-6">
        <p className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn/8 px-4 py-3 text-[0.8125rem] leading-relaxed text-warn">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Batas waktu RSVP sudah lewat, jadi jawaban tidak bisa diubah lagi. Kalau ada perubahan
            rencana, hubungi penyelenggara langsung.
          </span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 pb-5 sm:px-6" noValidate>
      <fieldset disabled={phase === "saving"} className="contents">
        {/* --- Pilihan status ------------------------------------------- */}
        <div role="radiogroup" aria-labelledby={`${baseId}-choice`} className="mt-5">
          <p id={`${baseId}-choice`} className="label-mono mb-2.5">
            Jawabanmu
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-selected={selected}
                  onClick={() => selectStatus(option.value)}
                  className={cx(
                    "tap flex flex-col items-start gap-1 rounded-lg border px-3.5 py-3 text-left",
                    "border-edge-bright bg-void-2/70 text-ink-muted transition-all duration-200",
                    "hover:border-edge-bright/80 hover:bg-panel-2",
                    option.accent,
                  )}
                >
                  <span className="flex items-center gap-2 font-mono text-[0.8125rem]">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {RSVP_STATUS_LABEL[option.value]}
                    {selected ? <span className="sr-only">(dipilih)</span> : null}
                  </span>
                  <span className="text-[0.75rem] leading-snug text-ink-faint">{option.blurb}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- Kunci "ikut acara", hanya untuk attending ----------------- */}
        <AnimatePresence initial={false}>
          {needsPassword ? (
            <motion.div
              key="password"
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-lg border border-violet-neon/35 bg-violet-deep/10 px-4 py-4">
                <p className="mb-3 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-violet-neon" aria-hidden="true" />
                  <span>
                    Khusus jawaban <span className="text-ink">Hadir</span>, masukkan kunci acara dulu.
                    Ini cara penyelenggara memastikan konfirmasi datang dari orang yang diundang.
                  </span>
                </p>

                <Field
                  id={`${baseId}-password`}
                  label={PASSWORD_LABEL}
                  hint={PASSWORD_HINT}
                  error={passwordError}
                  required
                >
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      id={`${baseId}-password`}
                      name="invite-key"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setPasswordError(null);
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={32}
                      placeholder="DD.MM.YYYY"
                      aria-describedby={cx(
                        `${baseId}-password-hint`,
                        passwordError ? `${baseId}-password-error` : undefined,
                      )}
                      aria-invalid={passwordError ? true : undefined}
                      className={cx(inputClass, "pr-12 font-mono tracking-wider")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="tap absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-faint hover:text-cyan-neon"
                      aria-label={showPassword ? "Sembunyikan kunci" : "Tampilkan kunci"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </Field>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* --- Pesan opsional -------------------------------------------- */}
        <div className="mt-4">
          <Field
            id={`${baseId}-message`}
            label="Pesan untuk penyelenggara (opsional)"
            hint={`${message.length}/${MESSAGE_MAX_LENGTH} karakter`}
          >
            <textarea
              id={`${baseId}-message`}
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
              rows={3}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder="Titip pesan, permintaan khusus, atau ucapan."
              aria-describedby={`${baseId}-message-hint`}
              className={cx(inputClass, "resize-y leading-relaxed")}
            />
          </Field>
        </div>

        {/* --- Aksi + state --------------------------------------------- */}
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="submit"
            disabled={phase === "saving" || status === null}
            className={buttonClass("primary", "w-full sm:w-auto sm:self-start")}
          >
            {phase === "saving" ? (
              <>
                <Spinner />
                Menyimpan…
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" />
                {saved ? "Perbarui jawaban" : "Simpan jawaban"}
              </>
            )}
          </button>

          {/* aria-live supaya hasil terbaca pembaca layar, bukan hanya warna. */}
          <div aria-live="polite" className="min-h-6">
            {phase === "saved" ? (
              <p className="flex items-center gap-2 text-[0.8125rem] text-ok">
                <Check className="size-4 shrink-0" aria-hidden="true" />
                Jawaban tersimpan di server.
              </p>
            ) : null}
            {formError ? (
              <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-bad" role="alert">
                <span aria-hidden="true">■</span>
                <span>{formError}</span>
              </p>
            ) : null}
          </div>

          {needsPassword ? (
            <p className="font-mono text-[0.6875rem] leading-relaxed text-ink-faint">
              Kunci ini diminta setiap kali kamu menyimpan jawaban Hadir. Jawaban Belum pasti dan
              Tidak hadir tidak perlu kunci.
            </p>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { buttonClass, cx, inputClass } from "@/components/ui/primitives";

/**
 * Menampilkan link undangan mentah SEKALI, dengan tombol salin.
 *
 * Fallback clipboard: bila navigator.clipboard tidak tersedia (http non-lokal,
 * izin ditolak, browser lama), input read-only tetap bisa diseleksi manual dan
 * teks petunjuknya berubah. Berbagi WhatsApp hanya terjadi atas klik admin.
 */
export function CopyField({ value, whatsappText }: { value: string; whatsappText?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function copy() {
    const input = inputRef.current;
    input?.select();

    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard tidak tersedia");
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      // Biarkan teks tetap terseleksi supaya admin bisa menekan Cmd/Ctrl+C.
      setState("manual");
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState("idle"), 4000);
  }

  const waHref = whatsappText
    ? `https://wa.me/?text=${encodeURIComponent(`${whatsappText}\n${value}`)}`
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="invite-link-output">
          Link undangan
        </label>
        <input
          ref={inputRef}
          id="invite-link-output"
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className={cx(inputClass, "font-mono text-[0.75rem]")}
        />
        <button type="button" onClick={copy} className={buttonClass("ghost", "shrink-0")}>
          {state === "copied" ? (
            <>
              <Check className="size-4" aria-hidden="true" /> Tersalin
            </>
          ) : (
            <>
              <Copy className="size-4" aria-hidden="true" /> Salin
            </>
          )}
        </button>
      </div>

      <div aria-live="polite" className="min-h-4">
        {state === "manual" ? (
          <p className="font-mono text-[0.6875rem] text-warn">
            Clipboard tidak tersedia di browser ini. Teks sudah diseleksi — tekan Cmd/Ctrl + C untuk
            menyalin manual.
          </p>
        ) : null}
        {state === "copied" ? (
          <p className="font-mono text-[0.6875rem] text-ok">Link tersalin ke clipboard.</p>
        ) : null}
      </div>

      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("subtle", "self-start")}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Bagikan lewat WhatsApp
        </a>
      ) : null}
    </div>
  );
}

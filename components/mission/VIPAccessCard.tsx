"use client";

import { useEffect, useRef, useState } from "react";
import { formatDisplayId } from "@/lib/mission/display-id-format";
import { PR_BUTTON_GHOST, PR_BUTTON_PRIMARY } from "./TerminalBoot";

type ExportState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; message: string }
  | { kind: "preview"; url: string };

/**
 * Kartu VIP.
 *
 * Kartu ini SOUVENIR — bukan bukti RSVP dan bukan kredensial masuk. Tidak
 * memuat token, bagian token, ID database mentah, maupun QR (QR default OFF
 * dan belum diaktifkan).
 *
 * Nama tamu dirender sebagai teks React. Nama kosong jatuh ke "Guest" tanpa
 * mengarang identitas.
 */
export function VIPAccessCard({
  guestName,
  displayId,
  eventTitle,
  onContinue,
  onReplay,
}: {
  guestName: string;
  displayId: string;
  eventTitle: string;
  onContinue: () => void;
  onReplay: () => void;
}) {
  const safeName = guestName.trim().length > 0 ? guestName.trim() : "Guest";
  const prettyId = formatDisplayId(displayId);
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const objectUrl = useRef<string | null>(null);

  // Lepaskan object URL supaya tidak bocor memori.
  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  async function download() {
    setExportState({ kind: "working" });
    try {
      // Lazy-load: exporter tidak ikut bundle awal.
      const { renderCardPng } = await import("@/lib/mission/card-png");
      const blob = await renderCardPng({ guestName: safeName, displayId: prettyId, eventTitle });

      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "project-r-vip.png"; // nama generik, tanpa token
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      // Beberapa browser mobile memblokir unduhan terprogram tanpa error.
      // Preview selalu ditawarkan supaya tamu tetap bisa simpan/bagikan manual.
      setExportState({ kind: "preview", url });
    } catch (error) {
      setExportState({
        kind: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Export failed. You can screenshot the card instead.",
      });
    }
  }

  return (
    <div className="pr-scanlines relative flex min-h-[100svh] flex-col justify-center px-5 py-10 sm:px-8">
      <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-[color:var(--pr-muted)]">
        MISSION COMPLETE // 4 OF 4
      </p>

      <section
        aria-labelledby="pr-card-title"
        className="mt-5 overflow-hidden rounded-lg border-2 border-[color:var(--pr-accent)] bg-[color:var(--pr-surface)]"
      >
        <div className="px-5 py-6 sm:px-7">
          <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-[color:var(--pr-muted)]">
            PROJECT_R // CLASSIFIED
          </p>
          <h1
            id="pr-card-title"
            className="mt-2 font-mono text-2xl font-bold tracking-tight text-[color:var(--pr-accent)] sm:text-3xl"
          >
            VIP ACCESS
          </h1>

          <div aria-hidden="true" className="mt-4 h-px w-full bg-[color:var(--pr-accent)]/35" />

          <dl className="mt-5 flex flex-col gap-4">
            <Row label="GUEST">
              <span className="text-xl leading-tight font-semibold break-words sm:text-2xl">
                {safeName}
              </span>
            </Row>
            <Row label="GUEST ID">
              <span className="font-mono text-[color:var(--pr-secondary)]">{prettyId}</span>
            </Row>
            <Row label="STATUS">
              <span className="font-mono font-bold text-[color:var(--pr-accent)]">
                ACCESS GRANTED
              </span>
            </Row>
            <Row label="CLEARANCE">
              <span className="font-mono font-bold text-[color:var(--pr-secondary)]">VIP</span>
            </Row>
            <Row label="EVENT">
              <span className="break-words">{eventTitle}</span>
            </Row>
          </dl>
        </div>

        <p className="border-t border-[color:var(--pr-accent)]/20 px-5 py-3 font-mono text-[0.6875rem] leading-relaxed text-[color:var(--pr-muted)] sm:px-7">
          Souvenir only — not proof of RSVP or admission.
        </p>
      </section>

      <div aria-live="polite" className="mt-4 min-h-6">
        {exportState.kind === "error" ? (
          <p className="font-mono text-[0.75rem] leading-relaxed text-[color:var(--pr-secondary)]">
            {exportState.message}
          </p>
        ) : null}
        {exportState.kind === "preview" ? (
          <div>
            <p className="font-mono text-[0.75rem] text-[color:var(--pr-muted)]">
              If the download did not start, press and hold the image below to save or share it.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={exportState.url}
              alt={`PROJECT R VIP card for ${safeName}`}
              className="mt-2 w-full max-w-xs rounded-md border border-[color:var(--pr-muted)]/30"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        {/* CTA undangan selalu tersedia, apa pun hasil ekspor. */}
        <button type="button" onClick={onContinue} className={PR_BUTTON_PRIMARY}>
          CONTINUE TO INVITATION
        </button>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={download}
            disabled={exportState.kind === "working"}
            className={PR_BUTTON_GHOST}
          >
            {exportState.kind === "working" ? "Rendering…" : "Download as PNG"}
          </button>
          <button type="button" onClick={onReplay} className={PR_BUTTON_GHOST}>
            Replay Mission
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[0.6875rem] tracking-[0.15em] text-[color:var(--pr-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-[color:var(--pr-text)]">{children}</dd>
    </div>
  );
}

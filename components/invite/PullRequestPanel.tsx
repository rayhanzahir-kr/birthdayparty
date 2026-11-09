import { GitPullRequest, GitMerge, GitPullRequestClosed, CircleDot } from "lucide-react";
import { StatusPill, cx } from "@/components/ui/primitives";
import type { RsvpStatus } from "@/lib/types";

/**
 * Kepala panel bergaya Pull Request.
 *
 * Metafora visual saja — tidak ada integrasi GitHub API (PRD §12). Setiap
 * istilah developer selalu didampingi penjelasan Indonesia yang jelas, supaya
 * tamu yang tidak paham istilah teknis tetap bisa RSVP.
 */
export function PullRequestHeader({
  guestName,
  status,
}: {
  guestName: string;
  status: RsvpStatus | null;
}) {
  const state = prState(status);

  return (
    <div className="border-b border-edge px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={state.tone} glyph={state.glyph}>
          {state.label}
        </StatusPill>
        <span className="label-mono">#1 · satu slot</span>
      </div>

      <h2 className="mt-3 text-lg leading-snug font-semibold tracking-tight text-ink sm:text-xl">
        Konfirmasi kehadiran {guestName}
      </h2>

      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.75rem] text-ink-faint">
        <span className="text-cyan-neon">guest/{slugify(guestName)}</span>
        <span aria-hidden="true">→</span>
        <span className="text-violet-neon">main</span>
      </p>

      <p className="mt-3 rounded-lg border border-edge-bright bg-void-2/60 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
        <span className="text-ink">1 undangan · 1 orang · tanpa +1.</span> Artinya: undangan ini
        hanya untuk kamu, dan tidak bisa menambah teman. Pilih jawabanmu di bawah, lalu tekan
        simpan.
      </p>
    </div>
  );
}

function prState(status: RsvpStatus | null): {
  label: string;
  glyph: string;
  tone: "ok" | "warn" | "bad" | "idle";
} {
  switch (status) {
    case "attending":
      return { label: "Merged · kamu ikut", glyph: "✓", tone: "ok" };
    case "maybe":
      return { label: "Draft · belum pasti", glyph: "◐", tone: "warn" };
    case "declined":
      return { label: "Closed · tidak hadir", glyph: "✕", tone: "bad" };
    default:
      return { label: "Open · menunggu jawaban", glyph: "○", tone: "idle" };
  }
}

/** Timeline commit/merge kecil di bawah form. */
export function PullRequestTimeline({
  status,
  respondedLabel,
}: {
  status: RsvpStatus | null;
  respondedLabel: string | null;
}) {
  const steps = [
    { label: "Undangan dibuat penyelenggara", done: true, icon: CircleDot },
    { label: "Link personal dibuka", done: true, icon: CircleDot },
    {
      label: status ? `Jawaban tersimpan: ${statusText(status)}` : "Menunggu jawaban kamu",
      done: status !== null,
      icon: status === "declined" ? GitPullRequestClosed : status ? GitMerge : GitPullRequest,
    },
  ];

  return (
    <ol className="space-y-0 px-5 pb-5 sm:px-6">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isLast = index === steps.length - 1;
        return (
          <li key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-full border",
                  step.done
                    ? "border-violet-neon/60 bg-violet-neon/15 text-violet-neon"
                    : "border-edge-bright bg-void text-ink-faint",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="my-1 w-px grow bg-linear-to-b from-violet-neon/40 to-edge-bright"
                />
              ) : null}
            </div>
            <div className={cx("min-w-0", isLast ? "pb-0" : "pb-4")}>
              <p className={cx("text-[0.8125rem]", step.done ? "text-ink" : "text-ink-faint")}>
                {step.label}
              </p>
              {isLast && respondedLabel ? (
                <p className="label-mono mt-0.5">{respondedLabel}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function statusText(status: RsvpStatus): string {
  return status === "attending" ? "Hadir" : status === "maybe" ? "Belum pasti" : "Tidak hadir";
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "tamu"
  );
}

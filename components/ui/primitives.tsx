import type { ReactNode } from "react";

/** Gabung className kondisional tanpa dependensi tambahan. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Panel({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside" | "header" | "footer";
}) {
  return <Tag className={cx("panel", className)}>{children}</Tag>;
}

/** Header panel bergaya tab repository. */
export function PanelHeader({
  icon,
  title,
  meta,
  accent = "violet",
}: {
  icon?: ReactNode;
  title: string;
  meta?: ReactNode;
  accent?: "violet" | "cyan";
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge px-4 py-3 sm:px-5">
      {icon ? (
        <span className={accent === "cyan" ? "text-cyan-neon" : "text-violet-neon"} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <h2 className="font-mono text-[0.8125rem] tracking-wide text-ink">{title}</h2>
      {meta ? <div className="ml-auto label-mono">{meta}</div> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger" | "subtle";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-linear-to-r from-violet-deep to-violet-neon text-white border-violet-neon/60 " +
    "hover:from-violet-neon hover:to-cyan-neon hover:text-void shadow-[0_0_24px_-6px] shadow-violet-neon/60",
  ghost: "bg-panel-2/70 text-ink border-edge-bright hover:border-cyan-neon hover:text-cyan-neon",
  danger: "bg-panel-2/70 text-bad border-bad/40 hover:bg-bad/15 hover:border-bad",
  subtle: "bg-transparent text-ink-muted border-transparent hover:text-ink hover:bg-panel-2/60",
};

export function buttonClass(variant: ButtonVariant = "primary", extra?: string): string {
  return cx(
    "tap inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5",
    "font-mono text-[0.8125rem] tracking-wide transition-all duration-200",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    BUTTON_VARIANTS[variant],
    extra,
  );
}

/** Label form eksplisit + pesan error yang terhubung lewat aria-describedby. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  required,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-mono text-ink-muted">
        {label}
        {required ? <span className="ml-1 text-violet-neon">*</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="font-mono text-[0.6875rem] text-ink-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[0.8125rem] text-bad" role="alert">
          <span aria-hidden="true">■</span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "tap w-full rounded-lg border border-edge-bright bg-void-2/80 px-3.5 py-2.5 text-ink " +
  "placeholder:text-ink-faint transition-colors focus:border-cyan-neon focus:outline-none " +
  "focus-visible:outline-2 focus-visible:outline-cyan-neon";

/**
 * Status pill. Tidak mengandalkan warna saja — setiap status punya glyph dan
 * teks sendiri (PRD §8).
 */
export function StatusPill({
  tone,
  glyph,
  children,
  className,
}: {
  tone: "ok" | "warn" | "bad" | "idle" | "info";
  glyph: string;
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<typeof tone, string> = {
    ok: "border-ok/40 bg-ok/12 text-ok",
    warn: "border-warn/40 bg-warn/12 text-warn",
    bad: "border-bad/40 bg-bad/12 text-bad",
    idle: "border-edge-bright bg-panel-2/70 text-ink-faint",
    info: "border-cyan-neon/40 bg-cyan-neon/12 text-cyan-neon",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "font-mono text-[0.6875rem] tracking-wide whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <span aria-hidden="true">{glyph}</span>
      {children}
    </span>
  );
}

/** Garis "branch" vertikal dekoratif ala graph commit. */
export function BranchRail({ active = false }: { active?: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex w-4 shrink-0 justify-center">
      <span className="absolute inset-y-0 w-px bg-linear-to-b from-violet-neon/50 via-edge-bright to-transparent" />
      <span
        className={cx(
          "relative mt-1.5 size-2.5 rounded-full border-2",
          active ? "border-cyan-neon bg-cyan-neon/30" : "border-edge-bright bg-void",
        )}
      />
    </span>
  );
}

/** Spinner inline untuk state loading tombol. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("size-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

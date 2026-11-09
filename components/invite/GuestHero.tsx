import { Panel } from "@/components/ui/primitives";

/**
 * Hero personal: nama tamu dengan identitas visual hologram/scanline.
 * Scanline dijaga sangat redup agar kontras teks tetap di atas 4.5:1.
 */
export function GuestHero({ guestName, hostName }: { guestName: string; hostName: string }) {
  return (
    <Panel className="scanlines relative overflow-hidden" as="header">
      {/* Sweep cahaya halus, berhenti total saat reduced motion. */}
      <span
        aria-hidden="true"
        className="sweep pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-cyan-neon/10 to-transparent"
      />
      <div className="relative px-5 py-8 sm:px-8 sm:py-10">
        <p className="label-mono text-cyan-neon">undangan personal · 1 slot</p>

        <h1 className="mt-3 text-balance text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl md:text-5xl">
          <span className="block text-ink-muted text-base font-normal sm:text-lg">Halo,</span>
          <span className="mt-1 block bg-linear-to-br from-ink via-violet-neon to-cyan-neon bg-clip-text text-transparent">
            {guestName}
          </span>
        </h1>

        <p className="mt-4 max-w-prose text-pretty text-sm leading-relaxed text-ink-muted sm:text-base">
          <span className="text-ink">{hostName}</span> mengirimkan undangan ini khusus untuk kamu.
          Link ini berlaku untuk satu orang, dan jawabanmu bisa diubah selama batas waktu belum
          lewat.
        </p>

        <div
          aria-hidden="true"
          className="mt-6 h-px w-full bg-linear-to-r from-violet-neon/70 via-cyan-neon/40 to-transparent"
        />
      </div>
    </Panel>
  );
}

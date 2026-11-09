import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { InviteExperience } from "@/components/invite/InviteExperience";
import { buttonClass } from "@/components/ui/primitives";
import type { InvitationView } from "@/lib/types";

export const metadata: Metadata = {
  title: "Demo tampilan · BIRTHDAY://PROTOCOL",
  description: "Demo visual dengan data fiktif.",
  robots: { index: false, follow: false },
};

/**
 * Halaman demo visual.
 *
 * Penting: demo berjalan SEPENUHNYA di komponen (prop `demo`), memakai data
 * fiktif, dan TIDAK memanggil /api/rsvp. Tidak ada token spesial "demo" yang
 * diterima endpoint produksi — jadi halaman ini tidak bisa dipakai sebagai
 * bypass. Tidak ada data nyata yang ditulis.
 */
const DEMO_INVITATION: InvitationView = {
  guest: { id: "00000000-0000-0000-0000-000000000000", name: "Tamu Contoh" },
  event: {
    title: "Birthday Protocol (demo)",
    host_name: "Penyelenggara Contoh",
    event_date: null,
    timezone: "Europe/Berlin",
    location_name: "Lokasi Contoh",
    location_url: null,
    dress_code: "Neon casual (contoh)",
    description:
      "Ini data fiktif untuk memperlihatkan tampilan undangan. Tidak ada jawaban yang benar-benar tersimpan.",
    rsvp_deadline: null,
  },
  rsvp: null,
  deadline_passed: false,
};

export default function DemoPage() {
  return (
    <main>
      {/* Label demo yang jelas dan selalu terlihat. */}
      <div className="sticky top-0 z-30 border-b border-warn/35 bg-warn/12 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 sm:px-6">
          <p className="flex items-center gap-2 font-mono text-[0.75rem] text-warn">
            <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
            MODE DEMO — data fiktif, jawaban tidak disimpan
          </p>
          <Link href="/" className="label-mono ml-auto text-warn hover:underline">
            keluar demo
          </Link>
        </div>
      </div>

      <InviteExperience token="demo" invitation={DEMO_INVITATION} demo />

      <div className="mx-auto w-full max-w-2xl px-4 pb-12 sm:px-6">
        <p className="rounded-lg border border-edge-bright bg-void-2/60 px-4 py-3.5 text-[0.8125rem] leading-relaxed text-ink-faint">
          Pada undangan sungguhan, jawaban <span className="text-ink">Hadir</span> diverifikasi di
          server bersama token personal dan batas waktu RSVP sebelum disimpan. Demo ini hanya
          memeriksa format input di browser agar alurnya terlihat, dan tidak pernah memanggil
          endpoint produksi.
        </p>
        <Link href="/" className={buttonClass("ghost", "mt-5")}>
          Kembali ke halaman utama
        </Link>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Panel, buttonClass } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Akses ditolak · BIRTHDAY://PROTOCOL",
  description: "Link tidak dapat dibuka.",
  robots: { index: false, follow: false },
};

/**
 * Pesan netral tunggal untuk SEMUA kegagalan link: bentuk token salah, token
 * tidak ada, undangan dinonaktifkan, atau link sudah dirotasi.
 *
 * Teksnya sengaja tidak membedakan kasus-kasus itu, sehingga tidak bisa dipakai
 * untuk menyimpulkan apakah seorang tamu ada di daftar (PRD §4.1).
 */
export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <Panel className="px-5 py-7 sm:px-8 sm:py-9">
        <p className="flex items-center gap-2 label-mono text-bad">
          <ShieldX className="size-4" aria-hidden="true" />
          403 · akses ditolak
        </p>

        <h1 className="mt-4 text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-3xl">
          Link ini tidak bisa dibuka
        </h1>

        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
          Link undangan yang kamu buka tidak dapat digunakan. Biasanya karena alamatnya kurang
          lengkap saat disalin, atau penyelenggara sudah menerbitkan link baru.
        </p>

        <div className="mt-5 rounded-lg border border-edge-bright bg-void-2/60 px-4 py-3.5">
          <p className="label-mono mb-2">yang bisa dicoba</p>
          <ul className="space-y-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">
            <li>· Buka kembali link dari pesan aslinya, jangan diketik manual.</li>
            <li>· Pastikan link tersalin utuh sampai karakter terakhir.</li>
            <li>· Minta penyelenggara mengirimkan link terbaru.</li>
          </ul>
        </div>

        <Link href="/" className={buttonClass("ghost", "mt-6 w-full sm:w-auto")}>
          Kembali ke halaman utama
        </Link>
      </Panel>
    </main>
  );
}

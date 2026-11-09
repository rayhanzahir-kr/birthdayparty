import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Panel, buttonClass } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Access denied · BIRTHDAY://PROTOCOL",
  description: "This link cannot be opened.",
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
          403 · access denied
        </p>

        <h1 className="mt-4 text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-3xl">
          This link cannot be opened
        </h1>

        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
          The invitation link you opened cannot be used. Usually the address was copied
          incompletely, or the host has issued a new link.
        </p>

        <div className="mt-5 rounded-lg border border-edge-bright bg-void-2/60 px-4 py-3.5">
          <p className="label-mono mb-2">what you can try</p>
          <ul className="space-y-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">
            <li>· Open the link from the original message instead of typing it.</li>
            <li>· Make sure the whole link was copied, down to the last character.</li>
            <li>· Ask the host to send you the latest link.</li>
          </ul>
        </div>

        <Link href="/" className={buttonClass("ghost", "mt-6 w-full sm:w-auto")}>
          Back to the home page
        </Link>
      </Panel>
    </main>
  );
}

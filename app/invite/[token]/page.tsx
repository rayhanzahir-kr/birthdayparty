import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { InviteExperience } from "@/components/invite/InviteExperience";
import { loadInvitation } from "@/lib/invitations";
import { isTokenShapeValid } from "@/lib/tokens";
import { getClientIp } from "@/lib/http";
import { RATE_LIMITS, consumeRateLimit } from "@/lib/rate-limit";
import { isServiceClientConfigured } from "@/lib/supabase/admin";
import { SetupNotice } from "@/components/ui/SetupNotice";

/** Rendering dinamis + no-store: halaman token tidak boleh di-cache publik. */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/** Metadata netral: tanpa nama tamu, tanpa detail acara, noindex. */
export const metadata: Metadata = {
  title: "Undangan personal · BIRTHDAY://PROTOCOL",
  description: "Undangan personal.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Bentuk token diperiksa sebelum menyentuh database.
  if (!isTokenShapeValid(token)) redirect("/access-denied");

  if (!isServiceClientConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <SetupNotice context="invite" />
      </main>
    );
  }

  // Rate limit pembacaan undangan: 60/menit/IP. Sengaja fail-open supaya tamu
  // tidak terkunci dari membaca undangan saat limiter bermasalah.
  const headerList = await headers();
  const pseudoRequest = new Request("http://localhost/invite", { headers: headerList });
  const lookupLimit = await consumeRateLimit(
    RATE_LIMITS.inviteLookupIp,
    [getClientIp(pseudoRequest)],
    { failOpen: true },
  );
  if (!lookupLimit.allowed) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-20 sm:px-6">
        <div className="panel px-5 py-6 text-center">
          <p className="label-mono text-warn">429 · terlalu banyak permintaan</p>
          <h1 className="mt-2 text-lg font-semibold text-ink">Tunggu sebentar</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Undangan ini dibuka terlalu sering dari jaringan yang sama. Coba muat ulang dalam satu
            menit.
          </p>
        </div>
      </main>
    );
  }

  const invitation = await loadInvitation(token);

  // Pesan netral yang sama untuk token salah, nonaktif, dan sudah dirotasi —
  // tidak mengungkap apakah seorang tamu ada atau tidak.
  if (!invitation) redirect("/access-denied");

  return (
    <main>
      <InviteExperience token={token} invitation={invitation} />
    </main>
  );
}

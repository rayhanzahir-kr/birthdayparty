import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/admin/DashboardClient";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { getPrimaryEvent, listGuests } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { isServiceClientConfigured } from "@/lib/supabase/admin";
import { Panel, buttonClass } from "@/components/ui/primitives";

/** Dinamis dan tidak di-cache: dashboard memuat data privat. */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Dashboard penyelenggara · BIRTHDAY://PROTOCOL",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminDashboardPage() {
  if (!isServiceClientConfigured()) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
        <SetupNotice context="admin" />
      </main>
    );
  }

  // Otorisasi diperiksa di sini DAN di setiap endpoint API yang dipakai halaman
  // ini — menyembunyikan UI saja tidak dianggap perlindungan.
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/admin/login");

  const event = await getPrimaryEvent();
  if (!event) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
        <Panel className="px-5 py-6">
          <p className="label-mono text-warn">migration belum lengkap</p>
          <h1 className="mt-2 text-lg font-semibold text-ink">Data acara belum ada</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Tabel <code className="font-mono text-cyan-neon">events</code> masih kosong. Jalankan{" "}
            <code className="font-mono text-cyan-neon">supabase/migrations/0002_seed.sql</code> di
            Supabase SQL Editor, lalu muat ulang halaman ini.
          </p>
          <a href="/admin/dashboard" className={buttonClass("ghost", "mt-5")}>
            Muat ulang
          </a>
        </Panel>
      </main>
    );
  }

  let initialData = {
    guests: [],
    summary: { total: 0, active: 0, inactive: 0, pending: 0, attending: 0, maybe: 0, declined: 0 },
  } as Awaited<ReturnType<typeof listGuests>>;

  try {
    initialData = await listGuests(event.id);
  } catch {
    // Daftar bisa dimuat ulang dari client lewat tombol Refresh.
  }

  return (
    <main>
      <DashboardClient
        initialEvent={event}
        initialData={initialData}
        adminEmail={auth.admin.email}
      />
    </main>
  );
}

import { AlertTriangle } from "lucide-react";

/**
 * Pesan setup yang jujur ketika Supabase belum dikonfigurasi.
 *
 * Tidak memalsukan login maupun keberhasilan penyimpanan — alih-alih itu,
 * halaman menjelaskan apa yang harus diisi dan menunjuk /demo untuk tampilan.
 */
export function SetupNotice({ context }: { context: "invite" | "admin" | "landing" }) {
  const messages: Record<typeof context, string> = {
    invite:
      "Undangan belum bisa dimuat karena server belum tersambung ke Supabase. Penyelenggara perlu menyelesaikan setup lebih dulu.",
    admin:
      "Login admin belum bisa diproses karena server belum tersambung ke Supabase. Selesaikan setup di README, lalu muat ulang halaman ini.",
    landing:
      "Aplikasi berjalan, tetapi belum tersambung ke Supabase. Undangan dan dashboard belum aktif.",
  };

  return (
    <section className="panel px-5 py-6 sm:px-7">
      <p className="flex items-center gap-2 label-mono text-warn">
        <AlertTriangle className="size-4" aria-hidden="true" />
        setup belum selesai
      </p>
      <h2 className="mt-3 text-lg font-semibold tracking-tight text-ink">
        Konfigurasi Supabase diperlukan
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{messages[context]}</p>

      <ol className="mt-4 space-y-2 border-l border-edge-bright pl-4 font-mono text-[0.75rem] leading-relaxed text-ink-faint">
        <li>1. Salin .env.example menjadi .env.local</li>
        <li>2. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
        <li>3. Isi SUPABASE_SERVICE_ROLE_KEY (server saja)</li>
        <li>4. Isi INVITE_PASSWORD_HASH lewat `npm run hash-password`</li>
        <li>5. Jalankan supabase/migrations/0001_init.sql dan 0002_seed.sql</li>
      </ol>

      <p className="mt-4 text-[0.8125rem] text-ink-muted">
        Ingin melihat tampilannya lebih dulu?{" "}
        <a
          href="/demo"
          className="tap text-cyan-neon underline decoration-dotted underline-offset-4 hover:decoration-solid"
        >
          Buka halaman demo
        </a>{" "}
        yang memakai data fiktif.
      </p>
    </section>
  );
}

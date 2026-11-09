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
      "This invitation cannot load because the server is not connected to Supabase yet. The host needs to finish the setup first.",
    admin:
      "Admin sign-in cannot be processed because the server is not connected to Supabase. Finish the setup in the README, then reload this page.",
    landing:
      "The app is running but not connected to Supabase yet. Invitations and the dashboard are not active.",
  };

  return (
    <section className="panel px-5 py-6 sm:px-7">
      <p className="flex items-center gap-2 label-mono text-warn">
        <AlertTriangle className="size-4" aria-hidden="true" />
        setup incomplete
      </p>
      <h2 className="mt-3 text-lg font-semibold tracking-tight text-ink">
        Supabase configuration required
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{messages[context]}</p>

      <ol className="mt-4 space-y-2 border-l border-edge-bright pl-4 font-mono text-[0.75rem] leading-relaxed text-ink-faint">
        <li>1. Copy .env.example to .env.local</li>
        <li>2. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY</li>
        <li>3. Set SUPABASE_SERVICE_ROLE_KEY (server only)</li>
        <li>4. Set INVITE_PASSWORD_HASH via `npm run hash-password`</li>
        <li>5. Run supabase/migrations/0001_init.sql and 0002_seed.sql</li>
      </ol>

      <p className="mt-4 text-[0.8125rem] text-ink-muted">
        Want to see how it looks first?{" "}
        <a
          href="/demo"
          className="tap text-cyan-neon underline decoration-dotted underline-offset-4 hover:decoration-solid"
        >
          Open the demo page
        </a>{" "}
        which uses fictional data.
      </p>
    </section>
  );
}

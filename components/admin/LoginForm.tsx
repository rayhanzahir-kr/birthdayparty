"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import { Field, Panel, Spinner, buttonClass, inputClass } from "@/components/ui/primitives";

/**
 * Login admin.
 *
 * Form mengirim kredensial ke /api/admin/login (server) agar login bisa
 * dibatasi rate limit dan cookie sesi di-set httpOnly oleh server. Pesan error
 * selalu generik, dan autocomplete dibiarkan aktif supaya password manager
 * tetap bekerja.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      setPassword("");
      // Refresh agar Server Component membaca cookie sesi yang baru.
      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Network trouble — the login was not processed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Panel className="px-5 py-7 sm:px-7">
      <p className="label-mono text-violet-neon">birthday://protocol · admin</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Host sign in</h1>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">
        Accounts are created by the operator in Supabase. There is no public sign-up here.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Field id="admin-email" label="Email" required>
          <input
            id="admin-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
            maxLength={200}
            className={inputClass}
          />
        </Field>

        <Field id="admin-password" label="Password" required>
          <input
            id="admin-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            maxLength={200}
            className={inputClass}
          />
        </Field>

        <div aria-live="polite" className="min-h-5">
          {error ? (
            <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-bad" role="alert">
              <span aria-hidden="true">■</span>
              <span>{error}</span>
            </p>
          ) : null}
        </div>

        <button type="submit" disabled={loading} className={buttonClass("primary", "w-full")}>
          {loading ? (
            <>
              <Spinner /> Checking…
            </>
          ) : (
            <>
              <LogIn className="size-4" aria-hidden="true" /> Sign in
            </>
          )}
        </button>
      </form>

      <p className="mt-6 flex items-start gap-2 font-mono text-[0.6875rem] leading-relaxed text-ink-faint">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        Admin sign-in uses Supabase Auth. It is separate from the birthday key guests use to
        confirm attendance.
      </p>
    </Panel>
  );
}

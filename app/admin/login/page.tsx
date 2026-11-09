import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { requireAdmin } from "@/lib/auth";
import { isServiceClientConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Login penyelenggara · BIRTHDAY://PROTOCOL",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (!isServiceClientConfigured()) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
        <SetupNotice context="admin" />
      </main>
    );
  }

  // Sudah login dan ter-allowlist? Langsung ke dashboard.
  const auth = await requireAdmin();
  if (auth.ok) redirect("/admin/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <LoginForm />
    </main>
  );
}

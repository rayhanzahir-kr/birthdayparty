import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** /admin -> dashboard bila sesi admin valid, selain itu ke login. */
export default async function AdminIndexPage() {
  const auth = await requireAdmin();
  redirect(auth.ok ? "/admin/dashboard" : "/admin/login");
}

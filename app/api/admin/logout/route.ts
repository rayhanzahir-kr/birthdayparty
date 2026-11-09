import { jsonResponse, verifySameOrigin, errorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/logout — akhiri sesi admin dan hapus cookie. */
export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return errorResponse("Unrecognized origin.", 403);
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  return jsonResponse({ ok: true as const });
}

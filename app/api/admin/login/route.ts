import { z } from "zod";
import { errorResponse, getClientIp, jsonResponse, logServerEvent, verifySameOrigin } from "@/lib/http";
import { RATE_LIMITS, consumeRateLimit, resetRateLimit, retryMessage } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceClient, isServiceClientConfigured } from "@/lib/supabase/admin";
import { BodyError, readJsonBody } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const loginSchema = z
  .object({
    email: z.string().email().max(200),
    password: z.string().min(1).max(200),
  })
  .strict();

/** Pesan tunggal: tidak membocorkan apakah email terdaftar atau bukan admin. */
const GENERIC_ERROR = "Incorrect email or password, or this account is not an admin.";

/**
 * POST /api/admin/login — login admin lewat Supabase Auth, dijalankan di server
 * agar bisa dibatasi rate limit (5 per 15 menit per IP) dan agar cookie sesi
 * di-set httpOnly.
 */
export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return errorResponse("Unrecognized origin.", 403);
  }
  if (!isServiceClientConfigured()) {
    return errorResponse(
      "Supabase is not configured. See the Environment section in the README.",
      503,
    );
  }

  const clientIp = getClientIp(request);
  const limit = await consumeRateLimit(RATE_LIMITS.adminLoginIp, [clientIp]);
  if (!limit.allowed) {
    return errorResponse(retryMessage(limit), 429, { retryAfter: limit.retryAfterSeconds });
  }

  let raw: unknown;
  try {
    raw = await readJsonBody(request);
  } catch (cause) {
    return errorResponse(cause instanceof BodyError ? cause.message : "Invalid request body.", 400);
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return errorResponse(GENERIC_ERROR, 400);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorResponse("Supabase is not configured.", 503);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    logServerEvent("admin_login_failed");
    return errorResponse(GENERIC_ERROR, 401);
  }

  // Terautentikasi belum berarti terotorisasi: cek allowlist admin.
  const { data: allowed } = await getServiceClient()
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!allowed) {
    await supabase.auth.signOut();
    logServerEvent("admin_login_not_allowlisted");
    return errorResponse(GENERIC_ERROR, 403);
  }

  await resetRateLimit(RATE_LIMITS.adminLoginIp, [clientIp]);
  return jsonResponse({ ok: true as const });
}

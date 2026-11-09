import { isInvitePasswordConfigured, getInvitePasswordHash } from "@/lib/env";
import { errorResponse, getClientIp, jsonResponse, logServerEvent, verifySameOrigin } from "@/lib/http";
import { submitRsvp } from "@/lib/invitations";
import { verifyInvitePassword } from "@/lib/password";
import { RATE_LIMITS, consumeRateLimit, resetRateLimit, retryMessage } from "@/lib/rate-limit";
import { isServiceClientConfigured } from "@/lib/supabase/admin";
import { hashToken, isTokenShapeValid } from "@/lib/tokens";
import type { RsvpStatus } from "@/lib/types";
import { BodyError, describeIssue, readJsonBody, rsvpSubmitSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/rsvp — satu-satunya jalur penyimpanan RSVP.
 *
 * Urutan gerbang (semuanya di server, semuanya sebelum write):
 *   1. Proteksi origin/CSRF.
 *   2. Batas ukuran + skema Zod `.strict()` (menolak guest_count/+1/guest_id).
 *   3. Rate limit per token dan per IP.
 *   4. Untuk attending: rate limit percobaan password, lalu verifikasi password
 *      terhadap INVITE_PASSWORD_HASH.
 *   5. RPC `submit_rsvp` mengulang validasi token aktif + deadline DI DALAM
 *      transaksi penulisan, dan menolak attending tanpa flag terverifikasi.
 *
 * Tidak ada attending yang disimpan lebih dulu lalu diperiksa belakangan.
 */
export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return errorResponse("Permintaan ditolak karena origin tidak dikenal.", 403);
  }

  if (!isServiceClientConfigured()) {
    return errorResponse(
      "Server belum dikonfigurasi untuk menyimpan RSVP. Hubungi penyelenggara.",
      503,
    );
  }

  let raw: unknown;
  try {
    raw = await readJsonBody(request);
  } catch (cause) {
    const message = cause instanceof BodyError ? cause.message : "Body tidak dapat dibaca.";
    return errorResponse(message, 400);
  }

  const parsed = rsvpSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return errorResponse(describeIssue(first), 400, { field: first?.path?.[0] ?? null });
  }

  const { token, message } = parsed.data;
  const status = parsed.data.status as RsvpStatus;
  const password = parsed.data.password;

  // Bentuk token diperiksa sebelum dipakai sebagai kunci rate limit.
  if (!isTokenShapeValid(token)) {
    return errorResponse("Link undangan tidak valid.", 404, { code: "invalid_token" });
  }

  const clientIp = getClientIp(request);
  const tokenHash = hashToken(token);

  // --- Gerbang 3: rate limit umum -------------------------------------------
  const tokenLimit = await consumeRateLimit(RATE_LIMITS.rsvpToken, [tokenHash]);
  if (!tokenLimit.allowed) {
    return errorResponse(retryMessage(tokenLimit), 429, { retryAfter: tokenLimit.retryAfterSeconds });
  }
  const ipLimit = await consumeRateLimit(RATE_LIMITS.rsvpIp, [clientIp]);
  if (!ipLimit.allowed) {
    return errorResponse(retryMessage(ipLimit), 429, { retryAfter: ipLimit.retryAfterSeconds });
  }

  // --- Gerbang 4: kunci "ikut acara", khusus attending ----------------------
  let passwordVerified = false;

  if (status === "attending") {
    if (!isInvitePasswordConfigured()) {
      // Tidak memalsukan keberhasilan saat hash belum dikonfigurasi.
      logServerEvent("invite_password_hash_missing");
      return errorResponse(
        "Konfirmasi kehadiran belum bisa diproses karena kunci acara belum disetel di server. " +
          "Hubungi penyelenggara.",
        503,
        { field: "password" },
      );
    }

    // Limiter percobaan password: per (IP, token) dan agregat per IP.
    // Fail-closed: kegagalan limiter tidak boleh membuka percobaan tanpa batas.
    const pairLimit = await consumeRateLimit(RATE_LIMITS.passwordPair, [clientIp, tokenHash]);
    if (!pairLimit.allowed) {
      return errorResponse(retryMessage(pairLimit), 429, {
        field: "password",
        retryAfter: pairLimit.retryAfterSeconds,
      });
    }
    const pwIpLimit = await consumeRateLimit(RATE_LIMITS.passwordIp, [clientIp]);
    if (!pwIpLimit.allowed) {
      return errorResponse(retryMessage(pwIpLimit), 429, {
        field: "password",
        retryAfter: pwIpLimit.retryAfterSeconds,
      });
    }

    const check = verifyInvitePassword(password, getInvitePasswordHash());
    if (!check.ok) {
      if (check.reason === "not_configured") {
        return errorResponse(
          "Kunci acara belum disetel di server. Hubungi penyelenggara.",
          503,
          { field: "password" },
        );
      }
      // Pesan sama untuk format salah maupun nilai salah: tidak membocorkan
      // apakah formatnya sudah benar. Respons lama tidak diubah sama sekali.
      logServerEvent("invite_password_rejected", { reason: check.reason });
      return errorResponse(
        "Kunci belum cocok. Masukkan tanggal lahir penyelenggara dengan format DD.MM.YYYY atau DD-MM-YYYY.",
        403,
        { field: "password", remaining: pairLimit.remaining },
      );
    }

    passwordVerified = true;
  }

  // --- Gerbang 5: validasi ulang + write atomik -----------------------------
  const result = await submitRsvp({ token, status, message: message ?? null, passwordVerified });

  switch (result.code) {
    case "ok":
      if (status === "attending") {
        // Percobaan yang berhasil tidak boleh ikut menghabiskan kuota.
        await resetRateLimit(RATE_LIMITS.passwordPair, [clientIp, tokenHash]);
      }
      return jsonResponse({ ok: true as const, rsvp: result.rsvp });

    case "invalid_token":
      return errorResponse(
        "Link undangan sudah tidak berlaku. Mungkin sudah diganti atau dinonaktifkan.",
        404,
        { code: "invalid_token" },
      );

    case "deadline_passed":
      return errorResponse(
        "Batas waktu RSVP sudah lewat, jadi jawaban tidak bisa diubah lagi.",
        409,
        { code: "deadline_passed" },
      );

    case "password_required":
      return errorResponse("Kunci untuk ikut acara wajib diisi.", 403, { field: "password" });

    default:
      return errorResponse("Gagal menyimpan jawaban. Coba lagi sebentar.", 500);
  }
}

/** Metode lain ditolak eksplisit; mutasi hanya lewat POST. */
export async function GET() {
  return errorResponse("Gunakan POST.", 405);
}

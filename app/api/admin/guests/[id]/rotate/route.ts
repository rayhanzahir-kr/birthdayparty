import { guardAdminRequest } from "@/lib/admin-guard";
import { getPrimaryEvent, rotateGuestToken } from "@/lib/admin-data";
import { errorResponse, jsonResponse } from "@/lib/http";
import { getSiteUrl } from "@/lib/env";
import { buildInviteUrl } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/guests/:id/rotate — terbitkan token baru.
 * Link lama langsung gagal pada lookup dan mutasi berikutnya; tamu dan RSVP
 * yang sudah ada dipertahankan.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminRequest(request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!UUID.test(id)) return errorResponse("Id tamu tidak valid.", 400);

  const event = await getPrimaryEvent();
  if (!event) return errorResponse("Acara belum ada.", 409);

  try {
    const rotated = await rotateGuestToken(event.id, id);
    if (!rotated) return errorResponse("Tamu tidak ditemukan.", 404);
    return jsonResponse({ ok: true as const, inviteUrl: buildInviteUrl(getSiteUrl(), rotated.token) });
  } catch (cause) {
    return errorResponse(cause instanceof Error ? cause.message : "Gagal rotasi link.", 500);
  }
}

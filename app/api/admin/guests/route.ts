import { guardAdminRequest } from "@/lib/admin-guard";
import { createGuest, getPrimaryEvent, listGuests } from "@/lib/admin-data";
import { errorResponse, jsonResponse } from "@/lib/http";
import { getSiteUrl } from "@/lib/env";
import { buildInviteUrl } from "@/lib/tokens";
import { BodyError, createGuestSchema, readJsonBody } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/guests — daftar tamu + ringkasan status (untuk refresh). */
export async function GET(request: Request) {
  const guard = await guardAdminRequest(request);
  if (!guard.ok) return guard.response;

  const event = await getPrimaryEvent();
  if (!event) return errorResponse("No event found. Run the seed migration.", 409);

  try {
    const result = await listGuests(event.id);
    return jsonResponse({ ok: true as const, ...result, timezone: event.timezone });
  } catch {
    return errorResponse("Failed to load the guest list.", 500);
  }
}

/**
 * POST /api/admin/guests — tambah satu tamu dan kembalikan link mentah.
 *
 * Link mentah HANYA ada di respons ini. Database menyimpan hash saja, jadi
 * tidak ada cara menampilkannya lagi nanti — hanya "Buat ulang link".
 */
export async function POST(request: Request) {
  const guard = await guardAdminRequest(request);
  if (!guard.ok) return guard.response;

  let raw: unknown;
  try {
    raw = await readJsonBody(request);
  } catch (cause) {
    return errorResponse(cause instanceof BodyError ? cause.message : "Invalid request body.", 400);
  }

  const parsed = createGuestSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid name.", 400, {
      field: "name",
    });
  }

  const event = await getPrimaryEvent();
  if (!event) return errorResponse("No event found. Run the seed migration.", 409);

  try {
    const created = await createGuest(event.id, parsed.data.name);
    return jsonResponse({
      ok: true as const,
      guest: { id: created.id, name: parsed.data.name },
      // Tidak dicatat ke log mana pun.
      inviteUrl: buildInviteUrl(getSiteUrl(), created.token),
    });
  } catch (cause) {
    return errorResponse(cause instanceof Error ? cause.message : "Failed to add the guest.", 500);
  }
}

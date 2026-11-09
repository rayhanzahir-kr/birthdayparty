import { guardAdminRequest } from "@/lib/admin-guard";
import { getPrimaryEvent, setGuestActive } from "@/lib/admin-data";
import { errorResponse, jsonResponse } from "@/lib/http";
import { BodyError, readJsonBody, setActiveSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/admin/guests/:id/active — aktifkan / nonaktifkan link undangan. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminRequest(request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!UUID.test(id)) return errorResponse("Id tamu tidak valid.", 400);

  let raw: unknown;
  try {
    raw = await readJsonBody(request);
  } catch (cause) {
    return errorResponse(cause instanceof BodyError ? cause.message : "Body tidak valid.", 400);
  }

  const parsed = setActiveSchema.safeParse(raw);
  if (!parsed.success) return errorResponse("Nilai is_active harus boolean.", 400);

  const event = await getPrimaryEvent();
  if (!event) return errorResponse("Acara belum ada.", 409);

  try {
    const found = await setGuestActive(event.id, id, parsed.data.is_active);
    if (!found) return errorResponse("Tamu tidak ditemukan.", 404);
    return jsonResponse({ ok: true as const, is_active: parsed.data.is_active });
  } catch (cause) {
    return errorResponse(cause instanceof Error ? cause.message : "Gagal mengubah status.", 500);
  }
}

import { guardAdminRequest } from "@/lib/admin-guard";
import { getPrimaryEvent, updateEvent } from "@/lib/admin-data";
import { isDeadlineConsistent } from "@/lib/datetime";
import { errorResponse, jsonResponse } from "@/lib/http";
import { BodyError, eventSettingsSchema, readJsonBody } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PUT /api/admin/event — ubah detail acara tanpa menyentuh kode. */
export async function PUT(request: Request) {
  const guard = await guardAdminRequest(request);
  if (!guard.ok) return guard.response;

  let raw: unknown;
  try {
    raw = await readJsonBody(request);
  } catch (cause) {
    return errorResponse(cause instanceof BodyError ? cause.message : "Body tidak valid.", 400);
  }

  const parsed = eventSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return errorResponse(first?.message ?? "Data tidak valid.", 400, {
      field: first?.path?.[0] ?? null,
    });
  }

  if (!isDeadlineConsistent(parsed.data.event_date, parsed.data.rsvp_deadline)) {
    return errorResponse("Batas RSVP tidak boleh sesudah waktu mulai acara.", 400, {
      field: "rsvp_deadline",
    });
  }

  const event = await getPrimaryEvent();
  if (!event) return errorResponse("Acara belum ada. Jalankan migration seed.", 409);

  try {
    const updated = await updateEvent(event.id, parsed.data);
    return jsonResponse({ ok: true as const, event: updated });
  } catch (cause) {
    return errorResponse(cause instanceof Error ? cause.message : "Gagal menyimpan.", 500);
  }
}

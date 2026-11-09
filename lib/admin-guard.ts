import "server-only";
import { requireAdmin, type AdminIdentity } from "./auth";
import { errorResponse, verifySameOrigin } from "./http";

/**
 * Gerbang bersama untuk semua route handler admin: origin check lalu verifikasi
 * sesi + allowlist. Dipanggil di setiap endpoint, bukan hanya di halaman.
 */
export async function guardAdminRequest(
  request: Request,
): Promise<{ ok: true; admin: AdminIdentity } | { ok: false; response: Response }> {
  if (!verifySameOrigin(request)) {
    return { ok: false, response: errorResponse("Unrecognized origin.", 403) };
  }

  const auth = await requireAdmin();
  if (auth.ok) return { ok: true, admin: auth.admin };

  if (auth.reason === "not_configured") {
    return {
      ok: false,
      response: errorResponse("Supabase is not configured on the server.", 503),
    };
  }
  // Pesan generik: tidak membedakan "belum login" dan "bukan admin".
  return { ok: false, response: errorResponse("Access denied.", 403) };
}

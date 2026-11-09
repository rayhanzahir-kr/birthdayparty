import { NextResponse } from "next/server";
import { getAllowedOrigins } from "./env";
import { evaluateOrigin } from "./origin";

const PRIVATE_CACHE = "private, no-store, max-age=0, must-revalidate";

export function jsonResponse<T>(body: T, status = 200, extraHeaders?: HeadersInit): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", PRIVATE_CACHE);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (extraHeaders) {
    for (const [key, value] of new Headers(extraHeaders).entries()) {
      response.headers.set(key, value);
    }
  }
  return response;
}

export function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return jsonResponse({ ok: false as const, error: message, ...extra }, status);
}

/**
 * Proteksi CSRF untuk mutasi. Logika keputusannya ada di lib/origin.ts dan
 * diuji terpisah; di sini hanya pengambilan header dan konfigurasi.
 */
export function verifySameOrigin(request: Request): boolean {
  return evaluateOrigin(
    {
      secFetchSite: request.headers.get("sec-fetch-site"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
    },
    getAllowedOrigins(),
  ).allowed;
}



/**
 * IP klien dari header platform tepercaya.
 *
 * Di Vercel, `x-forwarded-for` di-set oleh edge network dan entri paling KIRI
 * adalah klien. Header ini hanya dipercaya karena platform menimpanya; pada
 * self-host di belakang proxy lain, sesuaikan TRUSTED_IP_HEADER.
 */
export function getClientIp(request: Request): string {
  const customHeader = process.env.TRUSTED_IP_HEADER?.trim();
  if (customHeader) {
    const value = request.headers.get(customHeader);
    if (value) return value.split(",")[0]?.trim() ?? "unknown";
  }
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0]?.trim() ?? "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Logging aman: tidak pernah memuat token, URL undangan lengkap, password,
 * atau secret (PRD §7).
 */
export function logServerEvent(event: string, details: Record<string, string | number | boolean> = {}) {
  const safe = Object.entries(details)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  console.warn(`[birthday-protocol] ${event}${safe ? ` ${safe}` : ""}`);
}

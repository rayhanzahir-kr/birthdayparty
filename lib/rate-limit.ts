import "server-only";
import { createHash } from "node:crypto";
import { getServiceClient, isServiceClientConfigured } from "./supabase/admin";
import { logServerEvent } from "./http";

/**
 * Rate limiter persisten berbasis PostgreSQL (tabel `rate_limits` + RPC
 * `consume_rate_limit`). Cocok untuk Vercel serverless karena state tidak
 * tinggal di memori instance — berbeda dengan limiter in-memory yang TIDAK
 * memberi perlindungan terdistribusi.
 *
 * Perilaku saat limiter gagal (`failOpen`):
 *   - false (default untuk percobaan password): request DITOLAK. Kegagalan
 *     limiter tidak boleh diam-diam membuka semua akses.
 *   - true (lookup undangan): request diteruskan agar tamu tidak terkunci dari
 *     membaca undangan hanya karena infrastruktur limiter bermasalah.
 *
 * Bucket identifier selalu di-hash sehingga IP mentah dan token tidak tersimpan.
 */

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  /** Pembacaan undangan: 60 per menit per IP. */
  inviteLookupIp: { name: "invite_lookup_ip", limit: 60, windowSeconds: 60 },
  /** Penyimpanan RSVP: 10 per menit per token, 30 per menit per IP. */
  rsvpToken: { name: "rsvp_token", limit: 10, windowSeconds: 60 },
  rsvpIp: { name: "rsvp_ip", limit: 30, windowSeconds: 60 },
  /** Percobaan password attending: 5 kegagalan per 15 menit per (IP, token). */
  passwordPair: { name: "pw_pair", limit: 5, windowSeconds: 15 * 60 },
  /** Batas agregat IP untuk percobaan password. */
  passwordIp: { name: "pw_ip", limit: 20, windowSeconds: 15 * 60 },
  /** Login admin: 5 per 15 menit per IP. */
  adminLoginIp: { name: "admin_login_ip", limit: 5, windowSeconds: 15 * 60 },
} as const satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  degraded: boolean;
}

/** Identifier bucket di-hash agar IP/token mentah tidak pernah dipersistensi. */
function bucketKey(rule: RateLimitRule, ...parts: string[]): string {
  return createHash("sha256").update([rule.name, ...parts].join("|"), "utf8").digest("hex");
}

interface ConsumeOptions {
  /** true = hanya menghitung, tidak menambah counter. */
  peek?: boolean;
  failOpen?: boolean;
}

export async function consumeRateLimit(
  rule: RateLimitRule,
  parts: string[],
  options: ConsumeOptions = {},
): Promise<RateLimitResult> {
  const failOpen = options.failOpen ?? false;

  if (!isServiceClientConfigured()) {
    return degraded(rule, failOpen);
  }

  try {
    const { data, error } = await getServiceClient().rpc("consume_rate_limit", {
      p_bucket: bucketKey(rule, ...parts),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
      p_increment: options.peek ? 0 : 1,
    });

    if (error) {
      logServerEvent("rate_limit_rpc_error", { rule: rule.name, code: error.code ?? "unknown" });
      return degraded(rule, failOpen);
    }

    const row = Array.isArray(data) ? data[0] : data;
    const count = Number((row as { current_count?: number } | null)?.current_count ?? 0);
    const retryAfter = Number((row as { retry_after_seconds?: number } | null)?.retry_after_seconds ?? rule.windowSeconds);

    return {
      allowed: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfter)),
      degraded: false,
    };
  } catch (cause) {
    logServerEvent("rate_limit_exception", { rule: rule.name, kind: errorKind(cause) });
    return degraded(rule, failOpen);
  }
}

/** Menghapus counter kegagalan setelah percobaan password berhasil. */
export async function resetRateLimit(rule: RateLimitRule, parts: string[]): Promise<void> {
  if (!isServiceClientConfigured()) return;
  try {
    await getServiceClient().rpc("reset_rate_limit", { p_bucket: bucketKey(rule, ...parts) });
  } catch (cause) {
    logServerEvent("rate_limit_reset_failed", { rule: rule.name, kind: errorKind(cause) });
  }
}

function degraded(rule: RateLimitRule, failOpen: boolean): RateLimitResult {
  return {
    allowed: failOpen,
    remaining: failOpen ? rule.limit : 0,
    retryAfterSeconds: failOpen ? 0 : 60,
    degraded: true,
  };
}

function errorKind(cause: unknown): string {
  return cause instanceof Error ? cause.name : typeof cause;
}

export function retryMessage(result: RateLimitResult): string {
  if (result.degraded) {
    return "Pemeriksaan keamanan sedang tidak tersedia. Coba lagi dalam satu menit.";
  }
  const seconds = result.retryAfterSeconds;
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`;
  }
  return `Terlalu banyak percobaan. Coba lagi dalam ${seconds} detik.`;
}

import "server-only";
import { getAdminClient } from "./supabase/admin";
import { getClientIp } from "./security";

interface Bucket {
  count: number;
  resetAt: number;
}
const memory = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowSec: number) {
  const now = Date.now();
  if (memory.size > 5000) {
    for (const [k, b] of memory) if (b.resetAt < now) memory.delete(k);
  }
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

/**
 * Fixed-window rate limiter. Uses the shared Postgres counter (works across many server
 * instances) and falls back to per-instance memory if the database is unreachable.
 */
export async function rateLimit(
  request: Request,
  opts: { name: string; limit: number; windowSec: number; userId?: string | null },
): Promise<{ ok: boolean; retryAfter: number }> {
  const subject = opts.userId ? `u:${opts.userId}` : `ip:${getClientIp(request)}`;
  const key = `${opts.name}:${subject}`;

  const admin = getAdminClient();
  if (admin) {
    try {
      const { data, error } = await admin.rpc("consume_rate_limit", {
        p_key: key,
        p_limit: opts.limit,
        p_window_seconds: opts.windowSec,
      });
      if (!error && typeof data === "boolean") {
        return { ok: data, retryAfter: data ? 0 : opts.windowSec };
      }
    } catch {
      // fall through to the in-memory limiter
    }
  }
  return memoryLimit(key, opts.limit, opts.windowSec);
}

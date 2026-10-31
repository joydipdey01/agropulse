import "server-only";
import type { ZodType, ZodTypeDef } from "zod";
import { isSameOrigin, jsonError, readJson } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Common guard for JSON POST endpoints:
 * same-origin check → body size/JSON parse → schema validation → rate limit.
 */
export async function guardJson<T>(
  request: Request,
  schema: ZodType<T, ZodTypeDef, unknown>,
  opts: { name: string; limitAnon: number; limitUser: number; windowSec: number; requireAuth?: boolean },
) {
  if (!isSameOrigin(request)) return { response: jsonError("forbidden", 403) } as const;

  let user: { id: string } | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  if (isSupabaseConfigured()) {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ? { id: data.user.id } : null;
  }
  if (opts.requireAuth && !user) return { response: jsonError("unauthorized", 401) } as const;

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (e) {
    const tooLarge = e instanceof Error && e.message === "payload_too_large";
    return { response: jsonError(tooLarge ? "payload_too_large" : "invalid_json", tooLarge ? 413 : 400) } as const;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: jsonError("invalid_input", 400, { fields: parsed.error.flatten().fieldErrors }) } as const;
  }

  const limit = await rateLimit(request, {
    name: opts.name,
    limit: user ? opts.limitUser : opts.limitAnon,
    windowSec: opts.windowSec,
    userId: user?.id,
  });
  if (!limit.ok) {
    return { response: jsonError("rate_limited", 429, undefined, { "Retry-After": String(limit.retryAfter) }) } as const;
  }

  return { data: parsed.data, user, supabase } as const;
}

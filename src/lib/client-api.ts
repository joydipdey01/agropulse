import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) {
      const err = (json as { error?: string } | null)?.error ?? "error";
      return { ok: false, status: res.status, data: null, error: err };
    }
    return { ok: true, status: res.status, data: json as T, error: null };
  } catch {
    return { ok: false, status: 0, data: null, error: "network" };
  }
}

/** Maps an API failure to a localized message. */
export function apiErrorMessage(r: { status: number; error: string | null }, t: Dictionary): string {
  if (r.status === 0) return t.common.networkError;
  if (r.status === 429) return t.common.rateLimited;
  if (r.status === 400) return t.common.invalidInput;
  if (r.error === "ai_not_configured") return t.common.aiNotConfigured;
  return t.common.genericError;
}

export function aiStatusMessage(status: string, t: Dictionary): string | null {
  if (status === "unavailable" || status === "rate_limited") return status === "rate_limited" ? t.common.rateLimited : t.common.aiUnavailable;
  if (status === "not_configured") return t.common.aiNotConfigured;
  return null;
}

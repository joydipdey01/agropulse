import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin, jsonError, readJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const schema = z.object({ text: z.string().trim().min(1).max(3000), locale: z.enum(["en", "bn", "hi"]) });
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("forbidden", 403);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("unauthorized", 401);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return jsonError("speech_not_configured", 503);
  const limit = await rateLimit(request, { name: "voice-speak", limit: 60, windowSec: 600, userId: user.id });
  if (!limit.ok) return jsonError("rate_limited", 429, undefined, { "Retry-After": String(limit.retryAfter) });
  let body: unknown;
  try { body = await readJson(request, 12_000); } catch { return jsonError("invalid_request", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("invalid_request", 400);
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: parsed.data.text, model_id: "eleven_v3", language_code: parsed.data.locale }),
      signal: AbortSignal.timeout(25_000), cache: "no-store",
    });
    if (!response.ok) return jsonError("speech_generation_failed", 502);
    return new Response(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") || "audio/mpeg", "Cache-Control": "no-store" } });
  } catch { return jsonError("speech_unavailable", 502); }
}

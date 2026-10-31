import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin, jsonError } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const LOCALES = new Set(["en", "bn", "hi"]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("forbidden", 403);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("unauthorized", 401);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return jsonError("speech_not_configured", 503);
  const limit = await rateLimit(request, { name: "voice-transcribe", limit: 30, windowSec: 600, userId: user.id });
  if (!limit.ok) return jsonError("rate_limited", 429, undefined, { "Retry-After": String(limit.retryAfter) });
  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError("invalid_audio", 400); }
  const audio = form.get("audio");
  const locale = form.get("locale");
  if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES || typeof locale !== "string" || !LOCALES.has(locale)) return jsonError("invalid_audio", 400);
  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "voice.webm");
  upstream.append("model_id", "scribe_v2");
  upstream.append("language_code", locale);
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST", headers: { "xi-api-key": apiKey }, body: upstream,
      signal: AbortSignal.timeout(25_000), cache: "no-store",
    });
    if (!response.ok) return jsonError("transcription_failed", 502);
    const result = (await response.json()) as { text?: unknown };
    const transcript = typeof result.text === "string" ? result.text.trim().slice(0, 1500) : "";
    return Response.json({ transcript }, { headers: { "Cache-Control": "no-store" } });
  } catch { return jsonError("speech_unavailable", 502); }
}

import { NextResponse } from "next/server";
import { guardJson } from "@/lib/api";
import { soilSchema } from "@/lib/validation";
import { diagnoseSoil } from "@/lib/engines/soil";
import { groqComplete, isGroqConfigured } from "@/lib/groq";
import { briefSystemPrompt } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AiStatus = "ok" | "off" | "unavailable" | "rate_limited" | "not_configured";

export async function POST(request: Request) {
  const guard = await guardJson(request, soilSchema, { name: "soil", limitAnon: 40, limitUser: 120, windowSec: 600 });
  if ("response" in guard) return guard.response;
  const { data: input, user, supabase } = guard;

  const result = diagnoseSoil(input);
  // Remove control characters from the free-text label (it is stored, never sent to the AI).
  const sampleName = (input.sampleName ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80) || "Sample";

  let aiBrief: string | null = null;
  let aiStatus: AiStatus = "off";
  if (input.withAi) {
    if (!isGroqConfigured()) {
      aiStatus = "not_configured";
    } else {
      const ai = await rateLimit(request, { name: "ai", limit: user ? 40 : 8, windowSec: 3600, userId: user?.id });
      if (!ai.ok) {
        aiStatus = "rate_limited";
      } else {
        try {
          aiBrief = await groqComplete(
            [
              { role: "system", content: briefSystemPrompt(input.locale) },
              {
                role: "user",
                content: `Soil type: ${input.soilType}.
Values: N ${input.nitrogen} kg/ha (${result.n}), P ${input.phosphorus} kg/ha (${result.p}), K ${input.potassium} kg/ha (${result.k}), pH ${input.ph} (${result.ph}), organic carbon ${input.organicCarbon}% (${result.oc}), EC ${input.ec} dS/m (${result.ec}), moisture ${input.moisture}% (${result.moisture}).
Health score ${result.score}/100 (${result.rating}). Issues: ${result.issues.join(", ") || "none"}. Candidate bio-inputs: ${result.products.join(", ") || "none"}.`,
              },
            ],
            { temperature: 0.4, maxTokens: 500 },
          );
          aiStatus = aiBrief ? "ok" : "unavailable";
        } catch {
          aiStatus = "unavailable";
        }
      }
    }
  }

  let saved = false;
  if (user && supabase) {
    const { error } = await supabase.from("soil_tests").insert({
      user_id: user.id,
      sample_name: sampleName,
      soil_type: input.soilType,
      nitrogen: input.nitrogen,
      phosphorus: input.phosphorus,
      potassium: input.potassium,
      ph: input.ph,
      organic_carbon: input.organicCarbon,
      ec: input.ec,
      moisture: input.moisture,
      score: result.score,
      rating: result.rating,
      issues: result.issues,
      products: result.products,
      result,
      ai_brief: aiBrief,
      locale: input.locale,
    });
    saved = !error;
  }

  return NextResponse.json({ result, aiBrief, aiStatus, saved, signedIn: Boolean(user), sampleName }, { headers: { "Cache-Control": "no-store" } });
}

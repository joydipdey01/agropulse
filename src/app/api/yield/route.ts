import { NextResponse } from "next/server";
import { guardJson } from "@/lib/api";
import { yieldSchema } from "@/lib/validation";
import { predictYield } from "@/lib/engines/yield";
import { groqComplete, isGroqConfigured } from "@/lib/groq";
import { briefSystemPrompt } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AiStatus = "ok" | "off" | "unavailable" | "rate_limited" | "not_configured";

export async function POST(request: Request) {
  const guard = await guardJson(request, yieldSchema, { name: "yield", limitAnon: 40, limitUser: 120, windowSec: 600 });
  if ("response" in guard) return guard.response;
  const { data: input, user, supabase } = guard;

  const result = predictYield(input);

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
                content: `Crop: ${input.crop}; season: ${input.season}; area: ${input.areaAcres} acres; irrigation: ${input.irrigation}; seasonal rainfall: ${input.rainfallMm} mm.
Soil: N ${input.nitrogen} kg/ha, P ${input.phosphorus} kg/ha, K ${input.potassium} kg/ha, pH ${input.ph}, organic carbon ${input.organicCarbon}%, EC ${input.ec} dS/m.
Biofertiliser used: ${input.biofertiliser ? "yes" : "no"}; biopesticide used: ${input.biopesticide ? "yes" : "no"}.
Model estimate: ${result.perAcre} quintals/acre (${result.total} quintals total, likely ${result.low}-${result.high}); ${result.vsBaselinePct}% versus a well-managed field; water/climate risk: ${result.risk}.
Main factors (percent impact): ${result.drivers.map((d) => `${d.code} ${d.impactPct}%`).join(", ") || "none"}.`,
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
    const { error } = await supabase.from("crop_predictions").insert({
      user_id: user.id,
      crop: input.crop,
      season: input.season,
      area_acres: input.areaAcres,
      irrigation: input.irrigation,
      rainfall_mm: input.rainfallMm,
      biofertiliser: input.biofertiliser,
      biopesticide: input.biopesticide,
      per_acre: result.perAcre,
      total_yield: result.total,
      vs_baseline_pct: result.vsBaselinePct,
      risk: result.risk,
      confidence: result.confidence,
      inputs: {
        nitrogen: input.nitrogen,
        phosphorus: input.phosphorus,
        potassium: input.potassium,
        ph: input.ph,
        organicCarbon: input.organicCarbon,
        ec: input.ec,
      },
      result,
      ai_brief: aiBrief,
      locale: input.locale,
    });
    saved = !error;
  }

  return NextResponse.json({ result, aiBrief, aiStatus, saved, signedIn: Boolean(user) }, { headers: { "Cache-Control": "no-store" } });
}

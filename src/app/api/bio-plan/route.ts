import { NextResponse } from "next/server";
import { guardJson } from "@/lib/api";
import { bioPlanSchema } from "@/lib/validation";
import { getBioProduct } from "@/lib/data/bio-products";
import { HECTARE_TO_ACRE, round } from "@/lib/utils";
import { jsonError } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await guardJson(request, bioPlanSchema, { name: "bioplan", limitAnon: 0, limitUser: 60, windowSec: 600, requireAuth: true });
  if ("response" in guard) return guard.response;
  const { data: input, user, supabase } = guard;
  if (!user || !supabase) return jsonError("unauthorized", 401);

  const product = getBioProduct(input.productId);
  if (!product) return jsonError("invalid_input", 400);

  const areaAcres = input.areaUnit === "hectares" ? input.area * HECTARE_TO_ACRE : input.area;
  const amount = round(product.dose.amount * areaAcres, 2);
  const notes = (input.notes ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim() || null;

  const { error } = await supabase.from("bio_treatments").insert({
    user_id: user.id,
    product_id: product.id,
    category: product.category,
    crop: input.crop,
    area_acres: round(areaAcres, 3),
    dose_amount: amount,
    dose_unit: product.dose.unit,
    scheduled_date: input.scheduledDate ?? null,
    notes,
  });
  if (error) return jsonError("save_failed", 500);

  return NextResponse.json({ saved: true, amount, unit: product.dose.unit });
}

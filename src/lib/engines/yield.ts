import { CROPS, type CropId, type Irrigation, type Season } from "@/lib/data/crops";
import { clamp, round } from "@/lib/utils";

export interface YieldInput {
  crop: CropId;
  areaAcres: number;
  season: Season;
  nitrogen: number; // available N, kg/ha
  phosphorus: number; // available P (Olsen), kg/ha
  potassium: number; // available K, kg/ha
  ph: number;
  organicCarbon: number; // %
  ec: number; // dS/m
  rainfallMm: number; // seasonal rainfall
  irrigation: Irrigation;
  biofertiliser: boolean;
  biopesticide: boolean;
}

export type DriverCode =
  | "nutrients"
  | "ph"
  | "carbon"
  | "salinity"
  | "water"
  | "excessWater"
  | "season"
  | "biofertiliser"
  | "biopesticide";

export type AdviceCode =
  | "adviceN"
  | "adviceP"
  | "adviceK"
  | "adviceLime"
  | "adviceAlkaline"
  | "adviceCompost"
  | "adviceSalinity"
  | "adviceIrrigation"
  | "adviceSeason"
  | "adviceBiofertiliser"
  | "adviceBiopesticide"
  | "adviceMonitor";

export interface YieldResult {
  perAcre: number;
  total: number;
  low: number;
  high: number;
  baseline: number;
  vsBaselinePct: number;
  confidence: "high" | "moderate" | "low";
  risk: "low" | "moderate" | "high";
  drivers: { code: DriverCode; impactPct: number }[];
  advice: AdviceCode[];
}

/** Mitscherlich-style diminishing-returns response, normalised so index 1 (sufficient) = 1. */
function response(index: number): number {
  const k = 3;
  return Math.min(1, (1 - Math.exp(-k * Math.max(0, index))) / (1 - Math.exp(-k)));
}

const IRRIGATION_EFFICIENCY: Record<Irrigation, number> = {
  drip: 0.95,
  sprinkler: 0.85,
  flood: 0.75,
  rainfed: 0,
};

/**
 * Transparent agronomic response model. Every factor is a multiplier on the crop's baseline
 * yield, so each driver's contribution can be shown to the user. It is an advisory estimate,
 * not a trained statistical model.
 */
export function predictYield(input: YieldInput): YieldResult {
  const crop = CROPS[input.crop];
  const drivers: { code: DriverCode; impactPct: number }[] = [];
  const addDriver = (code: DriverCode, factor: number) => {
    const impact = Math.round((factor - 1) * 100);
    if (impact !== 0) drivers.push({ code, impactPct: impact });
  };

  // 1. Nutrients (Liebig-style limiting nutrient blended with the geometric mean)
  const fN = response(input.nitrogen / 280);
  const fP = response(input.phosphorus / 20);
  const fK = response(input.potassium / 140);
  const minF = Math.min(fN, fP, fK);
  const nutrientFactor = 0.6 * minF + 0.4 * Math.cbrt(fN * fP * fK);
  const limiting = minF === fN ? "n" : minF === fP ? "p" : "k";

  // 2. Soil pH
  const [lo, hi] = crop.phRange;
  const phDistance = input.ph < lo ? lo - input.ph : input.ph > hi ? input.ph - hi : 0;
  const phFactor = clamp(1 - 0.12 * phDistance, 0.6, 1);

  // 3. Organic carbon
  const ocFactor = input.organicCarbon < 0.3 ? 0.9 : input.organicCarbon < 0.5 ? 0.94 : input.organicCarbon < 0.75 ? 0.98 : 1;

  // 4. Salinity
  const ecFactor = input.ec <= 1 ? 1 : input.ec <= 2 ? 0.95 : input.ec <= 4 ? 0.8 : 0.6;

  // 5. Water: rainfall first, irrigation fills the remaining deficit at its efficiency
  const availability = Math.min(1, input.rainfallMm / crop.waterNeed);
  const waterIndex = availability + (1 - availability) * IRRIGATION_EFFICIENCY[input.irrigation];
  const waterFactor = 0.5 + 0.5 * waterIndex;
  const ratio = input.rainfallMm / crop.waterNeed;
  const excessFactor = !crop.waterloggingTolerant && ratio > 1.6 ? 0.9 : 1;

  // 6. Season suitability
  const seasonOk = crop.seasons.includes(input.season);
  const seasonFactor = seasonOk ? 1 : 0.7;

  // 7. Biological inputs (conservative; published field responses commonly range 5–15%)
  const bioFertFactor = input.biofertiliser ? 1.06 : 1;
  const bioPestFactor = input.biopesticide ? 1.04 : 1;

  addDriver("nutrients", nutrientFactor);
  addDriver("ph", phFactor);
  addDriver("carbon", ocFactor);
  addDriver("salinity", ecFactor);
  addDriver("water", waterFactor);
  addDriver("excessWater", excessFactor);
  addDriver("season", seasonFactor);
  addDriver("biofertiliser", bioFertFactor);
  addDriver("biopesticide", bioPestFactor);

  const multiplier = clamp(
    nutrientFactor * phFactor * ocFactor * ecFactor * waterFactor * excessFactor * seasonFactor * bioFertFactor * bioPestFactor,
    0.3,
    1.25,
  );

  const perAcre = round(crop.baseYield * multiplier, 2);
  const total = round(perAcre * input.areaAcres, 1);

  const stressCount = drivers.filter((d) => d.impactPct <= -5).length;
  const uncertainty = 10 + 3 * stressCount + (seasonOk ? 0 : 8);
  const low = round(total * (1 - uncertainty / 100), 1);
  const high = round(total * (1 + (uncertainty * 0.8) / 100), 1);
  const confidence = uncertainty <= 14 ? "high" : uncertainty <= 22 ? "moderate" : "low";

  // Climate / water risk
  let risk: YieldResult["risk"] = "low";
  if (input.irrigation === "rainfed") {
    if (ratio < 0.6 || (!crop.waterloggingTolerant && ratio > 1.8)) risk = "high";
    else if (ratio < 0.85 || (!crop.waterloggingTolerant && ratio > 1.4)) risk = "moderate";
  } else if (ratio < 0.4 || (!crop.waterloggingTolerant && ratio > 1.8)) {
    risk = "moderate";
  }

  // Advice (codes are translated in the UI)
  const advice: AdviceCode[] = [];
  if (nutrientFactor < 0.95) advice.push(limiting === "n" ? "adviceN" : limiting === "p" ? "adviceP" : "adviceK");
  if (input.ph < lo) advice.push("adviceLime");
  if (input.ph > hi) advice.push("adviceAlkaline");
  if (input.organicCarbon < 0.5) advice.push("adviceCompost");
  if (input.ec > 2) advice.push("adviceSalinity");
  if (input.irrigation === "rainfed" && ratio < 0.85) advice.push("adviceIrrigation");
  if (!seasonOk) advice.push("adviceSeason");
  if (!input.biofertiliser) advice.push("adviceBiofertiliser");
  if (!input.biopesticide) advice.push("adviceBiopesticide");
  if (advice.length === 0) advice.push("adviceMonitor");

  return {
    perAcre,
    total,
    low,
    high,
    baseline: crop.baseYield,
    vsBaselinePct: Math.round((perAcre / crop.baseYield - 1) * 100),
    confidence,
    risk,
    drivers,
    advice: advice.slice(0, 6),
  };
}

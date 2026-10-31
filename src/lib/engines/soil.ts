import type { SoilType } from "@/lib/data/crops";

export interface SoilInput {
  nitrogen: number; // kg/ha (available N)
  phosphorus: number; // kg/ha (Olsen P)
  potassium: number; // kg/ha (available K)
  ph: number;
  organicCarbon: number; // %
  ec: number; // dS/m
  moisture: number; // %
  soilType: SoilType;
}

export type Level = "low" | "medium" | "high";
export type PhClass = "stronglyAcidic" | "acidic" | "neutral" | "alkaline" | "stronglyAlkaline";
export type EcClass = "normal" | "slightlySaline" | "saline" | "highlySaline";
export type MoistureClass = "dry" | "optimal" | "wet";
export type IssueCode = "lowN" | "lowP" | "lowK" | "lowOC" | "highN" | "acidic" | "alkaline" | "saline" | "dry" | "wet";

export interface SoilResult {
  score: number;
  rating: "excellent" | "good" | "moderate" | "poor";
  n: Level;
  p: Level;
  k: Level;
  oc: Level;
  ph: PhClass;
  ec: EcClass;
  moisture: MoistureClass;
  issues: IssueCode[];
  products: string[];
}

// Rating bands follow the widely used Indian Soil Health Card categories.
const level = (v: number, lowMax: number, medMax: number): Level => (v < lowMax ? "low" : v <= medMax ? "medium" : "high");

export function diagnoseSoil(s: SoilInput): SoilResult {
  const n = level(s.nitrogen, 280, 560);
  const p = level(s.phosphorus, 10, 25);
  const k = level(s.potassium, 108, 280);
  const oc = level(s.organicCarbon, 0.5, 0.75);

  const ph: PhClass =
    s.ph < 5.5 ? "stronglyAcidic" : s.ph < 6.5 ? "acidic" : s.ph <= 7.5 ? "neutral" : s.ph <= 8.5 ? "alkaline" : "stronglyAlkaline";
  const ec: EcClass = s.ec < 1 ? "normal" : s.ec < 2 ? "slightlySaline" : s.ec <= 4 ? "saline" : "highlySaline";
  const moisture: MoistureClass = s.moisture < 12 ? "dry" : s.moisture <= 35 ? "optimal" : "wet";

  const nutrientScore = (l: Level) => (l === "low" ? 35 : l === "medium" ? 78 : 100);
  const phScore = { stronglyAcidic: 40, acidic: 78, neutral: 100, alkaline: 70, stronglyAlkaline: 40 }[ph];
  const ecScore = { normal: 100, slightlySaline: 75, saline: 40, highlySaline: 15 }[ec];

  const score = Math.round(
    nutrientScore(n) * 0.15 +
      nutrientScore(p) * 0.15 +
      nutrientScore(k) * 0.15 +
      nutrientScore(oc) * 0.2 +
      phScore * 0.2 +
      ecScore * 0.15,
  );
  const rating = score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "moderate" : "poor";

  const issues: IssueCode[] = [];
  const products = new Set<string>();
  if (n === "low") {
    issues.push("lowN");
    products.add("azotobacter").add("azospirillum");
  }
  if (n === "high" && s.nitrogen > 700) issues.push("highN");
  if (p === "low") {
    issues.push("lowP");
    products.add("psb");
  }
  if (k === "low") {
    issues.push("lowK");
    products.add("kmb");
  }
  if (oc === "low") {
    issues.push("lowOC");
    products.add("trichoderma").add("vam");
  }
  if (ph === "stronglyAcidic" || ph === "acidic") {
    if (ph === "stronglyAcidic" || s.ph < 6.0) issues.push("acidic");
    products.add("vam");
  }
  if (ph === "alkaline" || ph === "stronglyAlkaline") {
    issues.push("alkaline");
    products.add("psb");
  }
  if (ec === "saline" || ec === "highlySaline") {
    issues.push("saline");
    products.add("pseudomonas");
  }
  if (moisture === "dry") issues.push("dry");
  if (moisture === "wet") issues.push("wet");

  return { score, rating, n, p, k, oc, ph, ec, moisture, issues, products: [...products] };
}

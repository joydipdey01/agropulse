export const BIO_CATEGORIES = ["biofertiliser", "biopesticide", "botanical"] as const;
export type BioCategory = (typeof BIO_CATEGORIES)[number];

export const BIO_PRODUCT_IDS = [
  "rhizobium",
  "azotobacter",
  "azospirillum",
  "psb",
  "kmb",
  "vam",
  "bga",
  "trichoderma",
  "pseudomonas",
  "bt",
  "beauveria",
  "neem",
] as const;
export type BioProductId = (typeof BIO_PRODUCT_IDS)[number];

export interface BioProduct {
  id: BioProductId;
  category: BioCategory;
  /** Scientific name(s) — always shown in Latin script. */
  organism: string;
  /** Typical label dose per acre (carrier-based formulations). Always defer to the product label. */
  dose: { amount: number; unit: "kg" | "L" };
  /** Crops where the product is most commonly used; empty = broadly applicable. */
  crops: string[];
}

export const BIO_PRODUCTS: BioProduct[] = [
  { id: "rhizobium", category: "biofertiliser", organism: "Rhizobium leguminosarum / Bradyrhizobium japonicum", dose: { amount: 0.5, unit: "kg" }, crops: ["chickpea", "soybean"] },
  { id: "azotobacter", category: "biofertiliser", organism: "Azotobacter chroococcum", dose: { amount: 2, unit: "kg" }, crops: ["wheat", "maize", "mustard", "potato", "tomato", "sugarcane", "jute"] },
  { id: "azospirillum", category: "biofertiliser", organism: "Azospirillum brasilense", dose: { amount: 2, unit: "kg" }, crops: ["rice", "maize", "sugarcane", "wheat"] },
  { id: "psb", category: "biofertiliser", organism: "Bacillus megaterium / Pseudomonas striata", dose: { amount: 2, unit: "kg" }, crops: [] },
  { id: "kmb", category: "biofertiliser", organism: "Frateuria aurantia", dose: { amount: 2, unit: "kg" }, crops: ["potato", "sugarcane", "tomato", "rice", "maize"] },
  { id: "vam", category: "biofertiliser", organism: "Rhizophagus / Glomus spp. (VAM)", dose: { amount: 4, unit: "kg" }, crops: ["maize", "tomato", "potato", "soybean", "chickpea"] },
  { id: "bga", category: "biofertiliser", organism: "Anabaena / Nostoc / Aulosira (blue-green algae)", dose: { amount: 4, unit: "kg" }, crops: ["rice"] },
  { id: "trichoderma", category: "biopesticide", organism: "Trichoderma viride / T. harzianum", dose: { amount: 1, unit: "kg" }, crops: [] },
  { id: "pseudomonas", category: "biopesticide", organism: "Pseudomonas fluorescens", dose: { amount: 1, unit: "kg" }, crops: [] },
  { id: "bt", category: "biopesticide", organism: "Bacillus thuringiensis var. kurstaki", dose: { amount: 0.5, unit: "kg" }, crops: ["tomato", "maize", "chickpea", "soybean", "mustard"] },
  { id: "beauveria", category: "biopesticide", organism: "Beauveria bassiana", dose: { amount: 1, unit: "kg" }, crops: ["rice", "tomato", "soybean", "jute", "mustard"] },
  { id: "neem", category: "botanical", organism: "Azadirachta indica (azadirachtin 1500 ppm)", dose: { amount: 0.5, unit: "L" }, crops: [] },
];

export function getBioProduct(id: string): BioProduct | undefined {
  return BIO_PRODUCTS.find((p) => p.id === id);
}

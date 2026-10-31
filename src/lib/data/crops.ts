export const CROP_IDS = ["rice", "wheat", "maize", "jute", "potato", "mustard", "sugarcane", "chickpea", "soybean", "tomato"] as const;
export type CropId = (typeof CROP_IDS)[number];
export const SEASONS = ["kharif", "rabi", "zaid"] as const;
export type Season = (typeof SEASONS)[number];
export const IRRIGATION = ["drip", "sprinkler", "flood", "rainfed"] as const;
export type Irrigation = (typeof IRRIGATION)[number];
export const SOIL_TYPES = ["alluvial", "black", "red", "laterite", "clay", "sandy_loam"] as const;
export type SoilType = (typeof SOIL_TYPES)[number];

export interface CropProfile {
  /** Typical yield per acre (quintals) under good management; used as the model baseline. */
  baseYield: number;
  phRange: [number, number];
  /** Approximate seasonal crop water requirement in mm. */
  waterNeed: number;
  seasons: Season[];
  waterloggingTolerant?: boolean;
}

export const CROPS: Record<CropId, CropProfile> = {
  rice: { baseYield: 20, phRange: [5.5, 7.0], waterNeed: 1000, seasons: ["kharif", "rabi", "zaid"], waterloggingTolerant: true },
  wheat: { baseYield: 18, phRange: [6.0, 7.5], waterNeed: 400, seasons: ["rabi"] },
  maize: { baseYield: 25, phRange: [5.8, 7.5], waterNeed: 600, seasons: ["kharif", "rabi", "zaid"] },
  jute: { baseYield: 10, phRange: [6.0, 7.5], waterNeed: 1000, seasons: ["kharif"] },
  potato: { baseYield: 90, phRange: [5.2, 6.8], waterNeed: 450, seasons: ["rabi"] },
  mustard: { baseYield: 6, phRange: [6.0, 7.5], waterNeed: 300, seasons: ["rabi"] },
  sugarcane: { baseYield: 330, phRange: [6.0, 8.0], waterNeed: 1500, seasons: ["kharif", "rabi", "zaid"] },
  chickpea: { baseYield: 7, phRange: [6.0, 7.5], waterNeed: 350, seasons: ["rabi"] },
  soybean: { baseYield: 8, phRange: [6.0, 7.0], waterNeed: 650, seasons: ["kharif"] },
  tomato: { baseYield: 110, phRange: [6.0, 7.0], waterNeed: 600, seasons: ["kharif", "rabi", "zaid"] },
};

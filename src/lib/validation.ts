import { z } from "zod";
import { CROP_IDS, IRRIGATION, SEASONS, SOIL_TYPES } from "@/lib/data/crops";
import { BIO_PRODUCT_IDS } from "@/lib/data/bio-products";
import { LOCALES } from "@/lib/i18n/config";

const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const locale = z.enum(LOCALES).default("en");

const soilFields = {
  nitrogen: num(0, 1500),
  phosphorus: num(0, 300),
  potassium: num(0, 1500),
  ph: num(3, 10.5),
  organicCarbon: num(0, 10),
  ec: num(0, 20),
};

export const yieldSchema = z.object({
  crop: z.enum(CROP_IDS),
  areaAcres: num(0.01, 10000),
  season: z.enum(SEASONS),
  ...soilFields,
  rainfallMm: num(0, 5000),
  irrigation: z.enum(IRRIGATION),
  biofertiliser: z.boolean(),
  biopesticide: z.boolean(),
  withAi: z.boolean().default(true),
  locale,
});

export const soilSchema = z.object({
  sampleName: z.string().trim().max(80).optional(),
  ...soilFields,
  moisture: num(0, 100),
  soilType: z.enum(SOIL_TYPES),
  withAi: z.boolean().default(true),
  locale,
});

export const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(1500),
  locale,
});

export const bioPlanSchema = z.object({
  productId: z.enum(BIO_PRODUCT_IDS),
  crop: z.enum(CROP_IDS),
  area: num(0.01, 10000),
  areaUnit: z.enum(["acres", "hectares"]),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().trim().max(300).optional(),
});

export type YieldBody = z.infer<typeof yieldSchema>;
export type SoilBody = z.infer<typeof soilSchema>;

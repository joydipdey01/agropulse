import type { Locale } from "../config";
import { en, type Dictionary } from "./en";
import { bn } from "./bn";
import { hi } from "./hi";

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, bn, hi };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

export const LOCALES = ["en", "bn", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";
export const THEME_COOKIE = "theme";

export const LOCALE_LABELS: Record<Locale, { native: string; short: string; intl: string }> = {
  en: { native: "English", short: "EN", intl: "en-IN" },
  bn: { native: "বাংলা", short: "বাং", intl: "bn-IN" },
  hi: { native: "हिन्दी", short: "हि", intl: "hi-IN" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

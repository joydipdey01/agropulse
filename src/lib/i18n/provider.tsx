"use client";

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_LABELS, type Locale } from "./config";
import type { Dictionary } from "./dictionaries";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  switching: boolean;
  /** Format a number using the active language's digits (e.g. Bengali, Devanagari). */
  num: (value: number, maximumFractionDigits?: number) => string;
  date: (iso: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  const router = useRouter();
  const [switching, startTransition] = useTransition();

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
      startTransition(() => router.refresh());
    },
    [locale, router],
  );

  const value = useMemo<I18nValue>(() => {
    const intl = LOCALE_LABELS[locale].intl;
    return {
      locale,
      t: dictionary,
      setLocale,
      switching,
      num: (n, digits = 1) => new Intl.NumberFormat(intl, { maximumFractionDigits: digits }).format(n),
      date: (iso) => new Intl.DateTimeFormat(intl, { dateStyle: "medium" }).format(new Date(iso)),
    };
  }, [locale, dictionary, setLocale, switching]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

"use client";

import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ full = false }: { full?: boolean }) {
  const { locale, setLocale, switching, t } = useI18n();
  return (
    <div role="group" aria-label={t.nav.language} className={cn("inline-flex rounded-lg border border-border bg-surface p-0.5", switching && "opacity-70")}>
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            onClick={() => setLocale(code)}
            className={cn(
              "h-9 rounded-md px-3 text-sm font-medium transition-colors",
              full && "flex-1 px-4",
              active ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {full ? LOCALE_LABELS[code].native : LOCALE_LABELS[code].short}
          </button>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Footer({ t }: { t: Dictionary }) {
  const tools = [
    { href: "/crop-yield", label: t.nav.yield },
    { href: "/soil-health", label: t.nav.soil },
    { href: "/bio-solutions", label: t.nav.bio },
    { href: "/agronomist", label: t.nav.agronomist },
  ];
  const legal = [
    { href: "/privacy", label: t.footer.privacy },
    { href: "/cookies", label: t.footer.cookies },
    { href: "/terms", label: t.footer.terms },
  ];
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo name={t.meta.siteName} />
            <p className="mt-4 text-sm text-muted">{t.footer.tagline}</p>
          </div>
          <nav aria-label={t.footer.tools}>
            <h2 className="text-sm font-semibold text-fg">{t.footer.tools}</h2>
            <ul className="mt-3 space-y-2.5">
              {tools.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={t.footer.legal}>
            <h2 className="text-sm font-semibold text-fg">{t.footer.legal}</h2>
            <ul className="mt-3 space-y-2.5">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.copyright}</p>
          <p className="flex flex-wrap items-center gap-x-1.5">
            <Mail className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
            <span>{t.footer.contactBefore}</span>
            <a href={`mailto:${t.footer.email}`} className="font-medium text-link underline-offset-4 hover:underline">
              {t.footer.email}
            </a>
            <span aria-hidden>.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

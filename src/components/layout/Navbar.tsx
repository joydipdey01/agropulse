"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function Navbar({ signedIn, authEnabled }: { signedIn: boolean; authEnabled: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/crop-yield", label: t.nav.yield },
    { href: "/soil-health", label: t.nav.soil },
    { href: "/bio-solutions", label: t.nav.bio },
    { href: "/agronomist", label: t.nav.agronomist },
  ];

  const signOut = async () => {
    await createClient().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const authControls = authEnabled ? (
    signedIn ? (
      <>
        <Link href="/dashboard" className={buttonClass("secondary", "md")}>
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          {t.nav.dashboard}
        </Link>
        <button type="button" onClick={signOut} className={buttonClass("ghost", "md")}>
          <LogOut className="h-4 w-4" aria-hidden />
          {t.nav.signOut}
        </button>
      </>
    ) : (
      <Link href="/login" className={buttonClass("primary", "md")}>
        {t.nav.signIn}
      </Link>
    )
  ) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo name={t.meta.siteName} />

        <nav aria-label={t.nav.main} className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
                isActive(l.href) ? "bg-primary-soft text-link" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {authControls}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-fg"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="animate-in absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-bg shadow-pop lg:hidden">
          <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <nav aria-label={t.nav.main} className="flex flex-col gap-1">
              {links.map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={cn(
                    "animate-slide rounded-xl px-4 py-3.5 text-base font-medium",
                    isActive(l.href) ? "bg-primary-soft text-link" : "text-fg hover:bg-surface-2",
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-subtle">{t.nav.language}</span>
              <LanguageSwitcher full />
            </div>
            <div className="flex flex-col gap-2">{authControls}</div>
          </div>
        </div>
      )}
    </header>
  );
}

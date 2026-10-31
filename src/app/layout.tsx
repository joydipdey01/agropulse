import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { getI18n, getThemeCookie } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: `${t.meta.siteName} — ${t.meta.tagline}`, template: `%s | ${t.meta.siteName}` },
    description: t.meta.description,
    icons: { icon: "/favicon.svg" },
    applicationName: t.meta.siteName,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1713" },
  ],
};

// Applies the saved (or system) theme before first paint to avoid a flash.
const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);var d=m?m[1]==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  const theme = await getThemeCookie();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const user = await getCurrentUser();
  const configured = isSupabaseConfigured();

  return (
    <html lang={locale} className={cn(theme === "dark" && "dark")} suppressHydrationWarning>
      <head>
        <script
  nonce={nonce}
  suppressHydrationWarning
  dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
/>
      </head>
      <body className="flex min-h-screen flex-col">
        <I18nProvider locale={locale} dictionary={t}>
          <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
            {t.nav.skip}
          </a>
          <Navbar signedIn={Boolean(user)} authEnabled={configured} />
          {!configured && (
            <div className="border-b border-border bg-warn-soft px-4 py-2 text-center text-sm text-warn">
              <strong className="font-semibold">{t.setup.title}:</strong> {t.setup.text}
            </div>
          )}
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer t={t} />
          <CookieNotice />
        </I18nProvider>
      </body>
    </html>
  );
}

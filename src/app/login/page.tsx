import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/utils";
import { AuthForm } from "@/components/features/AuthForm";
import { LogoMark } from "@/components/ui/Logo";
import { Alert } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.signInTitle };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { t } = await getI18n();
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeRedirectPath(next));

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl lg:grid-cols-2">
      <aside className="field-pattern relative hidden overflow-hidden bg-primary-soft lg:block" aria-hidden>
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent" />
        <div className="relative flex h-full flex-col justify-center px-12 xl:px-20">
          <LogoMark className="h-14 w-14" />
          <h2 className="mt-8 max-w-md text-4xl font-bold leading-tight tracking-tight">{t.auth.panelTitle}</h2>
          <ul className="mt-8 space-y-4">
            {t.auth.panelPoints.map((p) => (
              <li key={p} className="flex max-w-md gap-3 text-muted">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          {error && <Alert tone="danger" className="mb-6">{t.auth.generic}</Alert>}
          <AuthForm next={next} />
        </div>
      </div>
    </div>
  );
}

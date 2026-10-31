import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { ResetPasswordForm } from "@/components/features/ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.newPasswordTitle };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <ResetPasswordForm linkError={Boolean(error)} />
    </div>
  );
}

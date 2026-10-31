import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { LegalPage } from "@/components/features/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.cookies.title };
}

export default async function Page() {
  const { t } = await getI18n();
  return <LegalPage doc={t.legal.cookies} updated={t.legal.updated} />;
}

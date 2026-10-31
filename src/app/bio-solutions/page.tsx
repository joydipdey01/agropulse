import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { Container, PageHeader } from "@/components/ui";
import { BioExplorer } from "@/components/features/BioExplorer";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.bio.title };
}

export default async function Page() {
  const { t } = await getI18n();
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader title={t.bio.title} subtitle={t.bio.subtitle} />
      <Container className="py-8 sm:py-12">
        <BioExplorer signedIn={Boolean(user)} />
        <p className="mt-8 text-xs text-subtle">{t.common.disclaimer}</p>
      </Container>
    </>
  );
}

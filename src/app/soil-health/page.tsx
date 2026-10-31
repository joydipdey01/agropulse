import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { Container, PageHeader } from "@/components/ui";
import { SoilTool } from "@/components/features/SoilTool";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.soil.title };
}

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.soil.title} subtitle={t.soil.subtitle} />
      <Container className="py-8 sm:py-12">
        <SoilTool />
      </Container>
    </>
  );
}

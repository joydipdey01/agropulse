import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { Container, PageHeader } from "@/components/ui";
import { YieldTool } from "@/components/features/YieldTool";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.yield.title };
}

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.yield.title} subtitle={t.yield.subtitle} />
      <Container className="py-8 sm:py-12">
        <YieldTool />
      </Container>
    </>
  );
}

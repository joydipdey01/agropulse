import { getI18n } from "@/lib/i18n/server";
import { LinkButton, Container } from "@/components/ui";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <Container className="py-24 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t.errors.notFoundTitle}</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">{t.errors.notFoundText}</p>
      <div className="mt-8">
        <LinkButton href="/">{t.errors.backHome}</LinkButton>
      </div>
    </Container>
  );
}

"use client";

import { Button, Container } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <Container className="py-24 text-center">
      <h1 className="text-2xl font-bold">{t.errors.errorTitle}</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">{t.errors.errorText}</p>
      <div className="mt-8">
        <Button onClick={reset}>{t.errors.tryAgain}</Button>
      </div>
    </Container>
  );
}

import { Container, PageHeader } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Doc = Dictionary["legal"]["privacy"];

export function LegalPage({ doc, updated }: { doc: Doc; updated: string }) {
  return (
    <>
      <PageHeader title={doc.title} subtitle={updated} />
      <Container className="py-10 sm:py-14">
        <article className="animate-page mx-auto max-w-3xl">
          <p className="text-lg text-muted">{doc.intro}</p>
          <div className="mt-10 space-y-9">
            {doc.sections.map((s) => (
              <section key={s.h}>
                <h2 className="text-xl font-semibold text-fg">{s.h}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted">
                  {s.p.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </Container>
    </>
  );
}

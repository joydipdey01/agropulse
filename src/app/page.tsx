import Link from "next/link";
import { ArrowRight, Bot, FlaskConical, Languages, Microscope, ShieldCheck, TrendingUp, Sprout } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { Container, LinkButton, Card } from "@/components/ui";
import { Reveal } from "@/components/ui/Reveal";
import { HeroArt } from "@/components/features/HeroArt";

export default async function HomePage() {
  const { t } = await getI18n();
  const h = t.home;
  const pillarMeta = [
    { href: "/crop-yield", icon: TrendingUp },
    { href: "/soil-health", icon: Microscope },
    { href: "/bio-solutions", icon: FlaskConical },
  ];
  const trustIcons = [ShieldCheck, Languages, Sprout];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="field-pattern pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <Container className="relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="animate-page">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-link">
              <Sprout className="h-4 w-4" aria-hidden />
              {h.eyebrow}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight text-fg sm:text-5xl lg:text-[3.4rem]">{h.title}</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{h.text}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/crop-yield" size="lg">
                {h.ctaYield}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
              <LinkButton href="/soil-health" size="lg" variant="secondary">
                {h.ctaSoil}
              </LinkButton>
            </div>
          </div>
          <div className="animate-page" style={{ animationDelay: "120ms" }}>
            <HeroArt />
          </div>
        </Container>
      </section>

      {/* Facts */}
      <section className="border-b border-border bg-surface">
        <Container className="grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {h.facts.map((f, i) => (
            <Reveal key={f.label} delay={i * 70}>
              <div className="text-center md:text-left">
                <p className="text-3xl font-bold text-primary">{f.value}</p>
                <p className="mt-1 text-sm text-muted">{f.label}</p>
              </div>
            </Reveal>
          ))}
        </Container>
      </section>

      {/* Pillars */}
      <section className="py-16 sm:py-20">
        <Container>
          <Reveal>
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight">{h.pillarsTitle}</h2>
              <p className="mt-3 text-muted">{h.pillarsText}</p>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {h.pillars.map((p, i) => {
              const Icon = pillarMeta[i].icon;
              return (
                <Reveal key={p.title} delay={i * 90}>
                  <Link href={pillarMeta[i].href} className="lift group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-card">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-link">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <h3 className="mt-5 text-xl font-semibold">{p.title}</h3>
                    <p className="mt-2 flex-1 text-[15px] text-muted">{p.text}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-link">
                      {h.open}
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-surface py-16 sm:py-20">
        <Container>
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight">{h.howTitle}</h2>
          </Reveal>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {h.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <li className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-fg">{i + 1}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-[15px] text-muted">{s.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      {/* AI agronomist */}
      <section className="py-16 sm:py-20">
        <Container>
          <Reveal>
            <div className="grid items-center gap-8 rounded-3xl border border-border bg-primary-soft p-8 sm:p-12 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-fg">
                  <Bot className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-5 text-3xl font-bold tracking-tight">{h.aiTitle}</h2>
                <p className="mt-3 max-w-xl text-muted">{h.aiText}</p>
                <div className="mt-7">
                  <LinkButton href="/agronomist" size="lg">
                    {h.aiCta}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </LinkButton>
                </div>
              </div>
              <div className="space-y-3" aria-hidden>
                {[t.agronomist.suggestions[0], t.agronomist.suggestions[2]].map((q, i) => (
                  <div key={q} className={`rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-card ${i % 2 ? "ml-6" : "mr-6"}`}>
                    {q}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Trust */}
      <section className="pb-4">
        <Container>
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight">{h.trustTitle}</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {h.trust.map((item, i) => {
              const Icon = trustIcons[i];
              return (
                <Reveal key={item.title} delay={i * 90}>
                  <Card className="h-full">
                    <Icon className="h-6 w-6 text-link" aria-hidden />
                    <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-[15px] text-muted">{item.text}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}

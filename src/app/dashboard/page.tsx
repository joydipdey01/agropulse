import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, FlaskConical, Microscope, MessageSquare } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_LABELS } from "@/lib/i18n/config";
import { Badge, Card, Container, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton, PlanStatus, ProfileForm } from "@/components/features/DashboardActions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboard.title };
}

interface YieldRow { id: string; crop: string; season: string; area_acres: number; total_yield: number; per_acre: number; risk: string; ai_brief: string | null; created_at: string }
interface SoilRow { id: string; sample_name: string | null; soil_type: string; score: number; rating: string; ai_brief: string | null; created_at: string }
interface PlanRow { id: string; product_id: string; crop: string; area_acres: number; dose_amount: number; dose_unit: string; scheduled_date: string | null; status: string; created_at: string }
interface ChatRow { id: string; title: string; updated_at: string }

function pick<T extends Record<string, string>>(map: T, key: string): string {
  return (map as Record<string, string>)[key] ?? key;
}

export default async function DashboardPage() {
  const { t, locale } = await getI18n();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const [profile, yields, soils, plans, chats] = await Promise.all([
    supabase.from("profiles").select("full_name, region, farm_scale, preferred_language").eq("id", user.id).maybeSingle(),
    supabase.from("crop_predictions").select("id, crop, season, area_acres, total_yield, per_acre, risk, ai_brief, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("soil_tests").select("id, sample_name, soil_type, score, rating, ai_brief, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("bio_treatments").select("id, product_id, crop, area_acres, dose_amount, dose_unit, scheduled_date, status, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("chat_conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(20),
  ]);

  const yieldRows = (yields.data ?? []) as YieldRow[];
  const soilRows = (soils.data ?? []) as SoilRow[];
  const planRows = (plans.data ?? []) as PlanRow[];
  const chatRows = (chats.data ?? []) as ChatRow[];

  const intl = LOCALE_LABELS[locale].intl;
  const n = (v: number, d = 1) => new Intl.NumberFormat(intl, { maximumFractionDigits: d }).format(v);
  const dt = (iso: string) => new Intl.DateTimeFormat(intl, { dateStyle: "medium" }).format(new Date(iso));

  const displayName = profile.data?.full_name || user.email || "";
  const stats = [
    { label: t.dashboard.yields, value: yieldRows.length, icon: BarChart3 },
    { label: t.dashboard.soils, value: soilRows.length, icon: Microscope },
    { label: t.dashboard.plans, value: planRows.length, icon: FlaskConical },
    { label: t.dashboard.chats, value: chatRows.length, icon: MessageSquare },
  ];

  const Empty = ({ text, href }: { text: string; href: string }) => (
    <div className="flex flex-col items-start gap-3 py-2 text-sm text-muted">
      <p>{text}</p>
      <LinkButton href={href} size="sm" variant="secondary">
        {t.dashboard.openTool}
      </LinkButton>
    </div>
  );

  return (
    <>
      <PageHeader title={t.dashboard.title} subtitle={`${t.dashboard.welcome}, ${displayName}`} />
      <Container className="space-y-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="flex items-center gap-4 p-4 sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-link">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-2xl font-bold">{n(s.value, 0)}</p>
                <p className="text-sm text-muted">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-8">
            <Card>
              <h2 className="text-lg font-semibold">{t.dashboard.yields}</h2>
              <div className="mt-4 divide-y divide-border">
                {yieldRows.length === 0 ? (
                  <Empty text={t.dashboard.emptyYields} href="/crop-yield" />
                ) : (
                  yieldRows.map((r) => (
                    <div key={r.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {pick(t.crops, r.crop)} · {pick(t.seasons, r.season)}
                          </p>
                          <p className="text-sm text-muted">
                            {n(r.area_acres)} {t.common.units.acres} · {n(r.total_yield)} {t.common.units.quintals} ({n(r.per_acre, 2)} {t.dashboard.perAcre}) · {dt(r.created_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge tone={r.risk === "high" ? "danger" : r.risk === "moderate" ? "warn" : "success"}>{pick(t.yield.risk, r.risk)}</Badge>
                          <DeleteButton table="crop_predictions" id={r.id} />
                        </div>
                      </div>
                      {r.ai_brief && (
                        <details className="mt-2 text-sm text-muted">
                          <summary className="cursor-pointer font-medium text-link">{t.dashboard.aiNote}</summary>
                          <p className="mt-2 whitespace-pre-wrap">{r.ai_brief}</p>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">{t.dashboard.soils}</h2>
              <div className="mt-4 divide-y divide-border">
                {soilRows.length === 0 ? (
                  <Empty text={t.dashboard.emptySoils} href="/soil-health" />
                ) : (
                  soilRows.map((r) => (
                    <div key={r.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.sample_name || pick(t.soilTypes, r.soil_type)}</p>
                          <p className="text-sm text-muted">
                            {pick(t.soilTypes, r.soil_type)} · {t.dashboard.score} {n(r.score, 0)}/{n(100, 0)} · {dt(r.created_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge tone={r.score >= 80 ? "success" : r.score >= 65 ? "primary" : r.score >= 45 ? "warn" : "danger"}>{pick(t.soil.ratings, r.rating)}</Badge>
                          <DeleteButton table="soil_tests" id={r.id} />
                        </div>
                      </div>
                      {r.ai_brief && (
                        <details className="mt-2 text-sm text-muted">
                          <summary className="cursor-pointer font-medium text-link">{t.dashboard.aiNote}</summary>
                          <p className="mt-2 whitespace-pre-wrap">{r.ai_brief}</p>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">{t.dashboard.plans}</h2>
              <div className="mt-4 divide-y divide-border">
                {planRows.length === 0 ? (
                  <Empty text={t.dashboard.emptyPlans} href="/bio-solutions" />
                ) : (
                  planRows.map((r) => {
                    const product = (t.bio.products as Record<string, { name: string }>)[r.product_id];
                    return (
                      <div key={r.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-medium">{product?.name ?? r.product_id}</p>
                          <p className="text-sm text-muted">
                            {pick(t.crops, r.crop)} · {n(r.area_acres)} {t.common.units.acres} · {n(r.dose_amount, 2)} {r.dose_unit === "L" ? t.common.units.L : t.common.units.kg}
                            {r.scheduled_date ? ` · ${dt(r.scheduled_date)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <PlanStatus id={r.id} status={r.status} />
                          <DeleteButton table="bio_treatments" id={r.id} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t.dashboard.profile}</h2>
              <ProfileForm
                userId={user.id}
                initial={{
                  full_name: profile.data?.full_name ?? "",
                  region: profile.data?.region ?? "",
                  farm_scale: profile.data?.farm_scale ?? "smallholder",
                  preferred_language: profile.data?.preferred_language ?? locale,
                }}
              />
            </Card>
            <Card>
              <h2 className="text-lg font-semibold">{t.dashboard.chats}</h2>
              <div className="mt-4 divide-y divide-border">
                {chatRows.length === 0 ? (
                  <Empty text={t.dashboard.emptyChats} href="/agronomist" />
                ) : (
                  chatRows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                      <Link href={`/agronomist?c=${r.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-medium hover:text-link">{r.title}</p>
                        <p className="text-xs text-subtle">{dt(r.updated_at)}</p>
                      </Link>
                      <DeleteButton table="chat_conversations" id={r.id} />
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}

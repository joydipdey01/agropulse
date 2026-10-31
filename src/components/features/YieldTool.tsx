"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Droplets, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Meter, Select, Skeleton, Toggle } from "@/components/ui";
import { SafeMarkdown } from "@/components/ui/SafeMarkdown";
import { NumberField, parseNumbers } from "./NumberField";
import { useI18n } from "@/lib/i18n/provider";
import { CROP_IDS, IRRIGATION, SEASONS, type CropId, type Irrigation, type Season } from "@/lib/data/crops";
import type { YieldResult } from "@/lib/engines/yield";
import { aiStatusMessage, apiErrorMessage, postJson } from "@/lib/client-api";

interface Response {
  result: YieldResult;
  aiBrief: string | null;
  aiStatus: string;
  saved: boolean;
  signedIn: boolean;
}

const RANGES = {
  areaAcres: [0.01, 10000],
  nitrogen: [0, 1500],
  phosphorus: [0, 300],
  potassium: [0, 1500],
  ph: [3, 10.5],
  organicCarbon: [0, 10],
  ec: [0, 20],
  rainfallMm: [0, 5000],
} as const satisfies Record<string, readonly [number, number]>;

const SAMPLE = { areaAcres: "2", nitrogen: "250", phosphorus: "18", potassium: "130", ph: "6.4", organicCarbon: "0.6", ec: "0.8", rainfallMm: "1000" };

export function YieldTool() {
  const { t, locale, num } = useI18n();
  const f = t.yield.form;
  const [crop, setCrop] = useState<CropId>("rice");
  const [season, setSeason] = useState<Season>("kharif");
  const [irrigation, setIrrigation] = useState<Irrigation>("flood");
  const [values, setValues] = useState<Record<keyof typeof SAMPLE, string>>(SAMPLE);
  const [biofertiliser, setBiofertiliser] = useState(false);
  const [biopesticide, setBiopesticide] = useState(false);
  const [withAi, setWithAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Partial<Record<keyof typeof SAMPLE, true>>>({});
  const [data, setData] = useState<Response | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data]);

  const set = (k: keyof typeof SAMPLE) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setInvalid((s) => ({ ...s, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseNumbers(values, RANGES as unknown as Record<keyof typeof SAMPLE, [number, number]>);
    if (!parsed.ok) {
      setInvalid(parsed.errors);
      setError(t.common.invalidInput);
      return;
    }
    setLoading(true);
    const res = await postJson<Response>("/api/yield", { crop, season, irrigation, biofertiliser, biopesticide, withAi, locale, ...parsed.values });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(apiErrorMessage(res, t));
      return;
    }
    setData(res.data);
  };

  const err = (k: keyof typeof SAMPLE) => (invalid[k] ? t.common.invalidInput : undefined);
  const r = data?.result;
  const riskTone = r?.risk === "high" ? "danger" : r?.risk === "moderate" ? "warn" : "success";
  const confTone = r?.confidence === "high" ? "success" : r?.confidence === "moderate" ? "warn" : "danger";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
      <form onSubmit={submit} noValidate className="space-y-6">
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold">{f.field}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={f.crop} htmlFor="crop">
              <Select id="crop" value={crop} onChange={(e) => setCrop(e.target.value as CropId)}>
                {CROP_IDS.map((c) => (
                  <option key={c} value={c}>
                    {t.crops[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <NumberField id="areaAcres" label={f.area} value={values.areaAcres} onChange={set("areaAcres")} min={0.01} max={10000} error={err("areaAcres")} />
            <Field label={f.season} htmlFor="season">
              <Select id="season" value={season} onChange={(e) => setSeason(e.target.value as Season)}>
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {t.seasons[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-lg font-semibold">{f.soil}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="nitrogen" label={f.nitrogen} value={values.nitrogen} onChange={set("nitrogen")} min={0} max={1500} error={err("nitrogen")} />
            <NumberField id="phosphorus" label={f.phosphorus} value={values.phosphorus} onChange={set("phosphorus")} min={0} max={300} error={err("phosphorus")} />
            <NumberField id="potassium" label={f.potassium} value={values.potassium} onChange={set("potassium")} min={0} max={1500} error={err("potassium")} />
            <NumberField id="ph" label={f.ph} value={values.ph} onChange={set("ph")} min={3} max={10.5} step="0.1" error={err("ph")} />
            <NumberField id="organicCarbon" label={f.oc} value={values.organicCarbon} onChange={set("organicCarbon")} min={0} max={10} step="0.01" error={err("organicCarbon")} />
            <NumberField id="ec" label={f.ec} value={values.ec} onChange={set("ec")} min={0} max={20} step="0.1" error={err("ec")} />
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-lg font-semibold">{f.climate}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="rainfallMm" label={f.rainfall} value={values.rainfallMm} onChange={set("rainfallMm")} min={0} max={5000} error={err("rainfallMm")} />
            <Field label={f.irrigation} htmlFor="irrigation">
              <Select id="irrigation" value={irrigation} onChange={(e) => setIrrigation(e.target.value as Irrigation)}>
                {IRRIGATION.map((i) => (
                  <option key={i} value={i}>
                    {t.irrigation[i]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <h2 className="pt-2 text-lg font-semibold">{f.bio}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle id="biofert" checked={biofertiliser} onChange={setBiofertiliser} label={f.biofertiliser} hint={f.biofertiliserHelp} />
            <Toggle id="biopest" checked={biopesticide} onChange={setBiopesticide} label={f.biopesticide} hint={f.biopesticideHelp} />
          </div>
          <Toggle id="withAi" checked={withAi} onChange={setWithAi} label={f.withAi} />
        </Card>

        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" size="lg" loading={loading} className="sm:flex-1">
            {loading ? f.working : f.submit}
          </Button>
          <Button type="button" size="lg" variant="secondary" onClick={() => { setValues(SAMPLE); setInvalid({}); setError(null); }}>
            {t.common.sample}
          </Button>
        </div>
      </form>

      <div ref={resultRef} className="scroll-mt-24 space-y-5 lg:sticky lg:top-24">
        {!r && !loading && (
          <Card className="flex flex-col items-center gap-3 py-14 text-center text-muted">
            <TrendingUp className="h-10 w-10 text-link" aria-hidden />
            <p className="max-w-xs text-sm">{t.yield.subtitle}</p>
          </Card>
        )}
        {loading && (
          <Card>
            <Skeleton lines={6} />
          </Card>
        )}
        {r && !loading && (
          <div className="animate-page space-y-5">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{t.yield.results.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={confTone}>
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t.yield.results.confidence}: {t.yield.confidence[r.confidence]}
                  </Badge>
                  <Badge tone={riskTone}>
                    <Droplets className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t.yield.results.risk}: {t.yield.risk[r.risk]}
                  </Badge>
                </div>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted">{t.yield.results.perAcre}</p>
                  <p className="mt-1 text-4xl font-bold text-primary">
                    {num(r.perAcre, 2)} <span className="text-lg font-medium text-muted">{t.common.units.quintals}</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">{t.yield.results.total}</p>
                  <p className="mt-1 text-4xl font-bold text-fg">
                    {num(r.total)} <span className="text-lg font-medium text-muted">{t.common.units.quintals}</span>
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">{t.yield.results.range}</dt>
                  <dd className="font-semibold">
                    {num(r.low)} – {num(r.high)} {t.common.units.quintals}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{t.yield.results.vsBaseline}</dt>
                  <dd className={`flex items-center gap-1.5 font-semibold ${r.vsBaselinePct < 0 ? "text-danger" : "text-success"}`}>
                    {r.vsBaselinePct < 0 ? <TrendingDown className="h-4 w-4" aria-hidden /> : <TrendingUp className="h-4 w-4" aria-hidden />}
                    {r.vsBaselinePct > 0 ? "+" : ""}
                    {num(r.vsBaselinePct, 0)}%
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h3 className="font-semibold">{t.yield.results.drivers}</h3>
              {r.drivers.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t.yield.results.noDrivers}</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {r.drivers.map((d) => (
                    <li key={d.code}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="text-fg">{t.yield.drivers[d.code]}</span>
                        <Badge tone={d.impactPct > 0 ? "success" : "danger"}>
                          {d.impactPct > 0 ? "+" : ""}
                          {num(d.impactPct, 0)}%
                        </Badge>
                      </div>
                      <Meter value={Math.min(100, Math.abs(d.impactPct) * 3)} tone={d.impactPct > 0 ? "success" : "danger"} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold">{t.yield.results.advice}</h3>
              <ul className="mt-4 space-y-3">
                {r.advice.map((a) => (
                  <li key={a} className="flex gap-3 text-[15px] text-muted">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span>{t.yield.advice[a]}</span>
                  </li>
                ))}
              </ul>
              <Link href="/bio-solutions" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link">
                {t.nav.bio}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Card>

            {data?.aiBrief && (
              <Card>
                <h3 className="mb-3 font-semibold">{t.yield.results.aiBrief}</h3>
                <SafeMarkdown text={data.aiBrief} />
              </Card>
            )}
            {data && aiStatusMessage(data.aiStatus, t) && (
              <Alert tone="warn">
                <AlertTriangle className="mr-2 inline h-4 w-4 align-text-bottom" aria-hidden />
                {aiStatusMessage(data.aiStatus, t)}
              </Alert>
            )}
            {data?.saved && <Alert tone="success">{t.common.savedToDashboard}</Alert>}
            {data && !data.signedIn && (
              <Alert tone="info">
                <Link href="/login?next=/crop-yield" className="font-semibold underline underline-offset-4">
                  {t.common.signInToSave}
                </Link>
              </Alert>
            )}

            <details className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
              <summary className="cursor-pointer font-medium text-fg">{t.yield.results.method}</summary>
              <p className="mt-2">{t.yield.results.methodText}</p>
            </details>
            <p className="text-xs text-subtle">{t.common.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

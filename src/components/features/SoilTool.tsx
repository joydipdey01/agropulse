"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CircleCheck, Microscope } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Input, Select, Skeleton, Toggle } from "@/components/ui";
import { SafeMarkdown } from "@/components/ui/SafeMarkdown";
import { NumberField, parseNumbers } from "./NumberField";
import { useI18n } from "@/lib/i18n/provider";
import { SOIL_TYPES, type SoilType } from "@/lib/data/crops";
import type { Level, SoilResult } from "@/lib/engines/soil";
import { aiStatusMessage, apiErrorMessage, postJson } from "@/lib/client-api";

interface Response {
  result: SoilResult;
  aiBrief: string | null;
  aiStatus: string;
  saved: boolean;
  signedIn: boolean;
  sampleName: string;
}

const RANGES = {
  nitrogen: [0, 1500],
  phosphorus: [0, 300],
  potassium: [0, 1500],
  ph: [3, 10.5],
  organicCarbon: [0, 10],
  ec: [0, 20],
  moisture: [0, 100],
} as const satisfies Record<string, readonly [number, number]>;

const SAMPLE = { nitrogen: "230", phosphorus: "9", potassium: "120", ph: "5.8", organicCarbon: "0.42", ec: "0.6", moisture: "24" };
type Key = keyof typeof SAMPLE;

function levelTone(l: Level): "danger" | "warn" | "success" {
  return l === "low" ? "danger" : l === "medium" ? "warn" : "success";
}

function ScoreRing({ score, tone }: { score: number; tone: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 128 128" className="h-32 w-32 shrink-0 -rotate-90" aria-hidden>
      <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="11" />
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        stroke={tone}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </svg>
  );
}

export function SoilTool() {
  const { t, locale, num } = useI18n();
  const f = t.soil.form;
  const [sampleName, setSampleName] = useState("");
  const [soilType, setSoilType] = useState<SoilType>("alluvial");
  const [values, setValues] = useState<Record<Key, string>>(SAMPLE);
  const [withAi, setWithAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Partial<Record<Key, true>>>({});
  const [data, setData] = useState<Response | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data]);

  const set = (k: Key) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setInvalid((s) => ({ ...s, [k]: undefined }));
  };
  const err = (k: Key) => (invalid[k] ? t.common.invalidInput : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseNumbers(values, RANGES as unknown as Record<Key, [number, number]>);
    if (!parsed.ok) {
      setInvalid(parsed.errors);
      setError(t.common.invalidInput);
      return;
    }
    setLoading(true);
    const res = await postJson<Response>("/api/soil", { sampleName: sampleName.trim() || undefined, soilType, withAi, locale, ...parsed.values });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(apiErrorMessage(res, t));
      return;
    }
    setData(res.data);
  };

  const r = data?.result;
  const scoreColor = !r ? "" : r.score >= 80 ? "var(--success)" : r.score >= 65 ? "var(--primary)" : r.score >= 45 ? "var(--warn)" : "var(--danger)";
  const rows = r
    ? [
        { name: t.soil.params.n, value: `${num(Number(values.nitrogen))} ${t.common.units.kgHa}`, label: t.soil.levels[r.n], tone: levelTone(r.n) },
        { name: t.soil.params.p, value: `${num(Number(values.phosphorus))} ${t.common.units.kgHa}`, label: t.soil.levels[r.p], tone: levelTone(r.p) },
        { name: t.soil.params.k, value: `${num(Number(values.potassium))} ${t.common.units.kgHa}`, label: t.soil.levels[r.k], tone: levelTone(r.k) },
        { name: t.soil.params.oc, value: `${num(Number(values.organicCarbon), 2)} ${t.common.units.percent}`, label: t.soil.levels[r.oc], tone: levelTone(r.oc) },
        { name: t.soil.params.ph, value: num(Number(values.ph)), label: t.soil.phClasses[r.ph], tone: r.ph === "neutral" ? ("success" as const) : r.ph === "acidic" || r.ph === "alkaline" ? ("warn" as const) : ("danger" as const) },
        { name: t.soil.params.ec, value: `${num(Number(values.ec))} ${t.common.units.dSm}`, label: t.soil.ecClasses[r.ec], tone: r.ec === "normal" ? ("success" as const) : r.ec === "slightlySaline" ? ("warn" as const) : ("danger" as const) },
        { name: t.soil.params.moisture, value: `${num(Number(values.moisture))} ${t.common.units.percent}`, label: t.soil.moistureClasses[r.moisture], tone: r.moisture === "optimal" ? ("success" as const) : ("warn" as const) },
      ]
    : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
      <form onSubmit={submit} noValidate className="space-y-6">
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold">{f.sample}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={f.sampleName} htmlFor="sampleName">
              <Input id="sampleName" value={sampleName} maxLength={80} placeholder={f.samplePlaceholder} onChange={(e) => setSampleName(e.target.value)} />
            </Field>
            <Field label={f.soilType} htmlFor="soilType">
              <Select id="soilType" value={soilType} onChange={(e) => setSoilType(e.target.value as SoilType)}>
                {SOIL_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {t.soilTypes[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold">{f.values}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="nitrogen" label={f.nitrogen} value={values.nitrogen} onChange={set("nitrogen")} min={0} max={1500} error={err("nitrogen")} />
            <NumberField id="phosphorus" label={f.phosphorus} value={values.phosphorus} onChange={set("phosphorus")} min={0} max={300} error={err("phosphorus")} />
            <NumberField id="potassium" label={f.potassium} value={values.potassium} onChange={set("potassium")} min={0} max={1500} error={err("potassium")} />
            <NumberField id="ph" label={f.ph} value={values.ph} onChange={set("ph")} min={3} max={10.5} step="0.1" error={err("ph")} />
            <NumberField id="organicCarbon" label={f.oc} value={values.organicCarbon} onChange={set("organicCarbon")} min={0} max={10} step="0.01" error={err("organicCarbon")} />
            <NumberField id="ec" label={f.ec} value={values.ec} onChange={set("ec")} min={0} max={20} step="0.1" error={err("ec")} />
            <NumberField id="moisture" label={f.moisture} value={values.moisture} onChange={set("moisture")} min={0} max={100} error={err("moisture")} />
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
            <Microscope className="h-10 w-10 text-link" aria-hidden />
            <p className="max-w-xs text-sm">{t.soil.subtitle}</p>
          </Card>
        )}
        {loading && (
          <Card>
            <Skeleton lines={6} />
          </Card>
        )}
        {r && !loading && data && (
          <div className="animate-page space-y-5">
            <Card>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <ScoreRing score={r.score} tone={scoreColor} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{num(r.score, 0)}</span>
                    <span className="text-xs text-muted">/ {num(100, 0)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted">{t.soil.results.score}</p>
                  <p className="text-2xl font-bold" style={{ color: scoreColor }}>
                    {t.soil.ratings[r.rating]}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {data.sampleName} · {t.soilTypes[soilType]}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden p-0 sm:p-0">
              <h3 className="px-5 pt-5 font-semibold sm:px-6">{t.soil.results.parameters}</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-subtle">
                      <th className="px-5 py-2 font-semibold sm:px-6">{t.soil.results.parameter}</th>
                      <th className="px-3 py-2 font-semibold">{t.soil.results.value}</th>
                      <th className="px-5 py-2 text-right font-semibold sm:px-6">{t.soil.results.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.name} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium sm:px-6">{row.name}</td>
                        <td className="px-3 py-3 text-muted">{row.value}</td>
                        <td className="px-5 py-3 text-right sm:px-6">
                          <Badge tone={row.tone}>{row.label}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold">{t.soil.results.issues}</h3>
              {r.issues.length === 0 ? (
                <p className="mt-3 flex gap-2 text-sm text-muted">
                  <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-hidden />
                  {t.soil.results.noIssues}
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {r.issues.map((code) => (
                    <li key={code} className="flex gap-3">
                      <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-warn" aria-hidden />
                      <div>
                        <p className="font-medium">{t.soil.issues[code].title}</p>
                        <p className="text-sm text-muted">{t.soil.issues[code].text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-5 rounded-lg bg-surface-2 p-3 text-sm text-muted">
                <span className="font-semibold text-fg">{t.soil.results.typeNote}: </span>
                {t.soil.typeNotes[soilType]}
              </p>
            </Card>

            <Card>
              <h3 className="font-semibold">{t.soil.results.products}</h3>
              {r.products.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t.soil.results.noProducts}</p>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {r.products.map((id) => {
                    const p = t.bio.products[id as keyof typeof t.bio.products];
                    if (!p) return null;
                    return (
                      <li key={id}>
                        <Link href={`/bio-solutions#p-${id}`} className="lift flex h-full flex-col rounded-xl border border-border bg-surface-2/50 p-4">
                          <span className="font-semibold">{p.name}</span>
                          <span className="mt-1 flex-1 text-sm text-muted">{p.targets}</span>
                          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-link">
                            {t.soil.results.viewProduct}
                            <ArrowRight className="h-4 w-4" aria-hidden />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {data.aiBrief && (
              <Card>
                <h3 className="mb-3 font-semibold">{t.soil.results.aiBrief}</h3>
                <SafeMarkdown text={data.aiBrief} />
              </Card>
            )}
            {aiStatusMessage(data.aiStatus, t) && (
              <Alert tone="warn">
                <AlertTriangle className="mr-2 inline h-4 w-4 align-text-bottom" aria-hidden />
                {aiStatusMessage(data.aiStatus, t)}
              </Alert>
            )}
            {data.saved && <Alert tone="success">{t.common.savedToDashboard}</Alert>}
            {!data.signedIn && (
              <Alert tone="info">
                <Link href="/login?next=/soil-health" className="font-semibold underline underline-offset-4">
                  {t.common.signInToSave}
                </Link>
              </Alert>
            )}
            <p className="text-xs text-subtle">{t.common.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

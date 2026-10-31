"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bug, ChevronDown, ClipboardList, FlaskConical, Leaf, Search } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { BIO_CATEGORIES, BIO_PRODUCTS, getBioProduct, type BioCategory, type BioProductId } from "@/lib/data/bio-products";
import { CROP_IDS, type CropId } from "@/lib/data/crops";
import { HECTARE_TO_ACRE, cn, round } from "@/lib/utils";
import { apiErrorMessage, postJson } from "@/lib/client-api";

const CATEGORY_ICON = { biofertiliser: Leaf, biopesticide: Bug, botanical: FlaskConical } as const;
const CATEGORY_TONE = { biofertiliser: "success", biopesticide: "warn", botanical: "accent" } as const;

export function BioExplorer({ signedIn }: { signedIn: boolean }) {
  const { t, num } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BioCategory | "all">("all");

  // Planner state
  const [productId, setProductId] = useState<BioProductId>("psb");
  const [crop, setCrop] = useState<CropId>("rice");
  const [area, setArea] = useState("1");
  const [unit, setUnit] = useState<"acres" | "hectares">("acres");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const plannerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BIO_PRODUCTS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      const text = t.bio.products[p.id];
      return [text.name, text.targets, p.organism].some((s) => s.toLowerCase().includes(q));
    });
  }, [query, category, t]);

  // Open and scroll to a product when arriving via /bio-solutions#p-<id>
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#p-")) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.querySelector("details")?.setAttribute("open", "");
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, []);

  const product = getBioProduct(productId)!;
  const areaNum = Number(area);
  const validArea = Number.isFinite(areaNum) && areaNum >= 0.01 && areaNum <= 10000;
  const acres = validArea ? (unit === "hectares" ? areaNum * HECTARE_TO_ACRE : areaNum) : 0;
  const total = round(product.dose.amount * acres, 2);

  const choose = (id: BioProductId) => {
    setProductId(id);
    setMessage(null);
    plannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validArea) {
      setMessage({ tone: "danger", text: t.common.invalidInput });
      return;
    }
    setSaving(true);
    const res = await postJson("/api/bio-plan", { productId, crop, area: areaNum, areaUnit: unit, scheduledDate: date || undefined, notes: notes.trim() || undefined });
    setSaving(false);
    setMessage(res.ok ? { tone: "success", text: t.bio.planner.saved } : { tone: "danger", text: apiErrorMessage(res, t) });
    if (res.ok) setNotes("");
  };

  const unitLabel = (u: "kg" | "L") => (u === "kg" ? t.common.units.kg : t.common.units.L);

  return (
    <div className="space-y-10">
      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.bio.search} aria-label={t.bio.search} className="pl-10" />
        </div>
        <div role="group" className="flex flex-wrap gap-2">
          {(["all", ...BIO_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                category === c ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-muted hover:border-primary hover:text-fg",
              )}
            >
              {c === "all" ? t.bio.all : t.bio.categories[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <Card className="py-12 text-center text-muted">{t.bio.noResults}</Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const text = t.bio.products[p.id];
            const Icon = CATEGORY_ICON[p.category];
            return (
              <article id={`p-${p.id}`} key={p.id} className="lift flex scroll-mt-28 flex-col rounded-2xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-link">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <Badge tone={CATEGORY_TONE[p.category]}>{t.bio.categories[p.category]}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{text.name}</h3>
                <p className="mt-0.5 text-sm italic text-subtle" lang="en">
                  {p.organism}
                </p>
                <p className="mt-3 text-sm text-muted">
                  <span className="font-semibold text-fg">{t.bio.targets}: </span>
                  {text.targets}
                </p>
                <p className="mt-2 text-sm text-muted">
                  <span className="font-semibold text-fg">{t.bio.dose}: </span>
                  {num(p.dose.amount, 2)} {unitLabel(p.dose.unit)} {t.bio.perAcre}
                </p>
                <details className="group mt-4 border-t border-border pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-link [&::-webkit-details-marker]:hidden">
                    {t.bio.how}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="animate-in mt-3 space-y-3 text-sm text-muted">
                    <p>{text.how}</p>
                    <p>
                      <span className="font-semibold text-fg">{t.bio.method}: </span>
                      {text.method}
                    </p>
                    <p className="rounded-lg bg-warn-soft p-3 text-warn">
                      <span className="font-semibold">{t.bio.caution}: </span>
                      {text.caution}
                    </p>
                    <p>
                      <span className="font-semibold text-fg">{t.bio.bestFor}: </span>
                      {p.crops.length ? p.crops.map((c) => t.crops[c as CropId]).join(", ") : t.bio.allCrops}
                    </p>
                  </div>
                </details>
                <div className="mt-auto pt-4">
                  <Button variant="secondary" size="sm" onClick={() => choose(p.id)} className="w-full">
                    <ClipboardList className="h-4 w-4" aria-hidden />
                    {t.bio.planner.title}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Planner */}
      <div ref={plannerRef} className="scroll-mt-28">
        <Card className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={save} className="space-y-5" noValidate>
            <div>
              <h2 className="text-xl font-semibold">{t.bio.planner.title}</h2>
              <p className="mt-1 text-sm text-muted">{t.bio.planner.text}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.bio.planner.product} htmlFor="plan-product">
                <Select id="plan-product" value={productId} onChange={(e) => setProductId(e.target.value as BioProductId)}>
                  {BIO_PRODUCTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {t.bio.products[p.id].name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.bio.planner.crop} htmlFor="plan-crop">
                <Select id="plan-crop" value={crop} onChange={(e) => setCrop(e.target.value as CropId)}>
                  {CROP_IDS.map((c) => (
                    <option key={c} value={c}>
                      {t.crops[c]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.bio.planner.area} htmlFor="plan-area" error={!validArea ? t.common.invalidInput : undefined}>
                <Input id="plan-area" type="number" inputMode="decimal" step="any" min={0.01} max={10000} value={area} onChange={(e) => setArea(e.target.value)} />
              </Field>
              <Field label={t.bio.planner.unit} htmlFor="plan-unit">
                <Select id="plan-unit" value={unit} onChange={(e) => setUnit(e.target.value as "acres" | "hectares")}>
                  <option value="acres">{t.common.units.acres}</option>
                  <option value="hectares">{t.common.units.hectares}</option>
                </Select>
              </Field>
              <Field label={t.bio.planner.date} htmlFor="plan-date">
                <Input id="plan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            <Field label={t.bio.planner.notes} htmlFor="plan-notes">
              <Textarea id="plan-notes" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {message && <Alert tone={message.tone}>{message.text}</Alert>}
            {signedIn ? (
              <Button type="submit" loading={saving}>
                {t.bio.planner.save}
              </Button>
            ) : (
              <Alert tone="info">
                <Link href="/login?next=/bio-solutions" className="font-semibold underline underline-offset-4">
                  {t.bio.planner.signIn}
                </Link>
              </Alert>
            )}
          </form>

          <div className="flex flex-col justify-center rounded-2xl bg-primary-soft p-6">
            <p className="text-sm text-muted">{t.bio.planner.total}</p>
            <p className="mt-2 text-4xl font-bold text-primary">
              {num(total, 2)} <span className="text-xl font-medium text-muted">{unitLabel(product.dose.unit)}</span>
            </p>
            <p className="mt-2 text-sm font-medium text-fg">{t.bio.products[productId].name}</p>
            <p className="mt-4 text-xs text-muted">{t.bio.planner.label}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

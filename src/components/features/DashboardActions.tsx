"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";

const TABLES = ["soil_tests", "crop_predictions", "bio_treatments", "chat_conversations"] as const;
type Table = (typeof TABLES)[number];

export function DeleteButton({ table, id }: { table: Table; id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!TABLES.includes(table) || !window.confirm(t.common.confirmDelete)) return;
    setBusy(true);
    const { error } = await createClient().from(table).delete().eq("id", id);
    setBusy(false);
    if (!error) router.refresh();
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={t.common.delete}
      title={t.common.delete}
      className="rounded-lg p-2 text-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function PlanStatus({ id, status }: { id: string; status: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(status);

  const change = async (next: string) => {
    const previous = value;
    setValue(next);
    const { error } = await createClient().from("bio_treatments").update({ status: next }).eq("id", id);
    if (error) setValue(previous);
    else router.refresh();
  };

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      aria-label={t.dashboard.plans}
      className="h-8 rounded-md border border-border bg-surface px-2 text-xs font-medium text-fg focus:border-primary focus:outline-none"
    >
      {(["planned", "applied", "verified"] as const).map((s) => (
        <option key={s} value={s}>
          {t.dashboard.status[s]}
        </option>
      ))}
    </select>
  );
}

export function ProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial: { full_name: string; region: string; farm_scale: string; preferred_language: string };
}) {
  const { t, locale, setLocale } = useI18n();
  const d = t.dashboard;
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const { error } = await createClient()
      .from("profiles")
      .update({
        full_name: form.full_name.trim().slice(0, 100) || null,
        region: form.region.trim().slice(0, 120) || null,
        farm_scale: form.farm_scale,
        preferred_language: form.preferred_language,
      })
      .eq("id", userId);
    setSaving(false);
    setMessage(error ? { tone: "danger", text: t.common.genericError } : { tone: "success", text: d.profileSaved });
    if (!error && LOCALES.includes(form.preferred_language as Locale) && form.preferred_language !== locale) {
      setLocale(form.preferred_language as Locale);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={d.name} htmlFor="p-name">
          <Input id="p-name" value={form.full_name} maxLength={100} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label={d.region} htmlFor="p-region">
          <Input id="p-region" value={form.region} maxLength={120} onChange={(e) => setForm({ ...form, region: e.target.value })} />
        </Field>
        <Field label={d.scale} htmlFor="p-scale">
          <Select id="p-scale" value={form.farm_scale} onChange={(e) => setForm({ ...form, farm_scale: e.target.value })}>
            {(["smallholder", "commercial", "cooperative", "research"] as const).map((s) => (
              <option key={s} value={s}>
                {d.scales[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={d.language} htmlFor="p-lang">
          <Select id="p-lang" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}>
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l].native}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Button type="submit" loading={saving}>
        {d.saveProfile}
      </Button>
    </form>
  );
}

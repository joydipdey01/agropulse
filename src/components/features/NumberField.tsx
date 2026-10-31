"use client";

import { Field, Input } from "@/components/ui";

export function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <Input
        id={id}
        name={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        required
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** Parses all values; returns null if any is missing, non-numeric or out of range. */
export function parseNumbers<K extends string>(
  values: Record<K, string>,
  ranges: Record<K, [number, number]>,
): { ok: true; values: Record<K, number> } | { ok: false; errors: Partial<Record<K, true>> } {
  const out = {} as Record<K, number>;
  const errors: Partial<Record<K, true>> = {};
  (Object.keys(values) as K[]).forEach((k) => {
    const n = Number(values[k]);
    const [lo, hi] = ranges[k];
    if (values[k].trim() === "" || !Number.isFinite(n) || n < lo || n > hi) errors[k] = true;
    else out[k] = n;
  });
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values: out };
}

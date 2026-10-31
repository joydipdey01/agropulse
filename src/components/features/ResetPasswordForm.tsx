"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm({ linkError }: { linkError: boolean }) {
  const { t } = useI18n();
  const a = t.auth;
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">(linkError ? "invalid" : "checking");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (linkError) return;
    createClient()
      .auth.getUser()
      .then(({ data }) => setReady(data.user ? "ok" : "invalid"))
      .catch(() => setReady("invalid"));
  }, [linkError]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(a.weakPassword);
      return;
    }
    setLoading(true);
    const { error: err } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.code === "weak_password" ? a.weakPassword : a.generic);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1400);
  };

  return (
    <div className="animate-page w-full max-w-md">
      <h1 className="text-3xl font-bold tracking-tight">{a.newPasswordTitle}</h1>
      {ready === "invalid" ? (
        <div className="mt-6 space-y-5">
          <Alert tone="danger">{a.linkInvalid}</Alert>
          <Link href="/login" className="inline-block font-semibold text-link underline-offset-4 hover:underline">
            {a.backToSignIn}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-8 space-y-5">
          <Field label={a.newPassword} htmlFor="new-password" hint={a.passwordHint}>
            <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={ready !== "ok" || done} />
          </Field>
          {error && <Alert tone="danger">{error}</Alert>}
          {done && <Alert tone="success">{a.passwordUpdated}</Alert>}
          <Button type="submit" size="lg" loading={loading} disabled={ready !== "ok" || done} className="w-full">
            {a.updatePassword}
          </Button>
        </form>
      )}
    </div>
  );
}

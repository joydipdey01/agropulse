"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeRedirectPath } from "@/lib/utils";

type Mode = "signin" | "signup" | "verify" | "forgot";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const a = t.auth;
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const mapError = (err: { message?: string; status?: number; code?: string }) => {
    if (err.status === 429 || err.code === "over_request_rate_limit" || err.code === "over_email_send_rate_limit" || /rate.?limit/i.test(err.message ?? "")) return t.common.rateLimited;
    if (err.code === "weak_password" || /password/i.test(err.message ?? "") && /(least|weak|short)/i.test(err.message ?? "")) return a.weakPassword;
    if (err.code === "invalid_credentials" || /invalid login/i.test(err.message ?? "")) return a.invalidCredentials;
    if (err.code === "user_already_exists" || /already registered|already exists/i.test(err.message ?? "")) return a.accountExists;
    if (/database error saving new user/i.test(err.message ?? "")) return a.signupDatabaseError;
    if (err.code === "otp_expired" || /expired/i.test(err.message ?? "")) return a.otpExpired;
    return `${a.generic} (${err.message || err.code || "Supabase Auth error"})`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!configured) {
      setError(a.notConfigured);
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) {
      setError(a.emailInvalid);
      return;
    }
    if ((mode === "signup" || mode === "signin") && password.length < 8) {
      setError(a.weakPassword);
      return;
    }

    if (mode === "verify" && !/^\d{6,8}$/.test(token.trim())) {
      setError(a.otpInvalid);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) return setError(mapError(err));
        router.push(safeRedirectPath(next));
        router.refresh();
      } else if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: fullName.trim().slice(0, 100) },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirectPath(next))}`,
          },
        });
        if (err) return setError(mapError(err));
        if (data.session) {
          router.push(safeRedirectPath(next));
          router.refresh();
        } else {
          setInfo(a.checkEmail);
          setMode("verify");
          setPassword("");
        }
      } else if (mode === "verify") {
        const { error: err } = await supabase.auth.verifyOtp({ email: cleanEmail, token: token.trim(), type: "signup" });
        if (err) return setError(mapError(err));
        router.push(safeRedirectPath(next));
        router.refresh();
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (err && (err.status === 429 || err.code === "over_email_send_rate_limit")) return setError(t.common.rateLimited);
        setInfo(a.resetSent);
      }
    } catch {
      setError(t.common.networkError);
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "signin" ? a.signInTitle : mode === "signup" ? a.signUpTitle : mode === "verify" ? a.verifyTitle : a.forgotTitle;
  const text = mode === "signin" ? a.signInText : mode === "signup" ? a.signUpText : mode === "verify" ? a.verifyText : a.forgotText;
  const cta = mode === "signin" ? a.signInButton : mode === "signup" ? a.signUpButton : mode === "verify" ? a.verifyButton : a.forgotButton;

  return (
    <div className="animate-page w-full max-w-md">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-muted">{text}</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {mode === "signup" && (
          <Field label={a.fullName} htmlFor="fullName">
            <Input id="fullName" autoComplete="name" value={fullName} maxLength={100} onChange={(e) => setFullName(e.target.value)} />
          </Field>
        )}
        <Field label={a.email} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {mode === "verify" && (
          <Field label={a.otpLabel} htmlFor="otp" hint={a.otpHint}>
            <Input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={8} value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))} required />
          </Field>
        )}
        {(mode === "signin" || mode === "signup") && (
          <Field label={a.password} htmlFor="password" hint={mode === "signup" ? a.passwordHint : undefined}>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? a.hidePassword : a.showPassword}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:text-fg"
              >
                {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>
        )}

        {mode === "signin" && (
          <div className="-mt-2 text-right">
            <button type="button" onClick={() => switchMode("forgot")} className="text-sm font-medium text-link underline-offset-4 hover:underline">
              {a.forgotLink}
            </button>
          </div>
        )}

        {!configured && <Alert tone="warn">{a.notConfigured}</Alert>}
        {error && <Alert tone="danger">{error}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? a.working : cta}
        </Button>
      </form>

      {mode === "verify" && (
        <button type="button" disabled={loading} onClick={async () => {
          setLoading(true); setError(null); setInfo(null);
          try {
            const { error: err } = await createClient().auth.resend({ type: "signup", email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirectPath(next))}` } });
            if (err) setError(mapError(err)); else setInfo(a.otpResent);
          } catch { setError(t.common.networkError); } finally { setLoading(false); }
        }} className="mt-4 w-full text-center text-sm font-semibold text-link underline-offset-4 hover:underline disabled:opacity-60">{a.resendOtp}</button>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        {(mode === "signin" || mode === "verify") && (
          <>
            {a.noAccount}{" "}
            <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-link underline-offset-4 hover:underline">
              {a.toSignUp}
            </button>
          </>
        )}
        {mode === "signup" && (
          <>
            {a.haveAccount}{" "}
            <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-link underline-offset-4 hover:underline">
              {a.toSignIn}
            </button>
          </>
        )}
        {mode === "forgot" && (
          <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-link underline-offset-4 hover:underline">
            {a.backToSignIn}
          </button>
        )}
      </p>
      <p className="mt-6 text-center text-xs text-subtle">
        <Link href="/terms" className="underline-offset-4 hover:underline">{t.footer.terms}</Link>
        {" · "}
        <Link href="/privacy" className="underline-offset-4 hover:underline">{t.footer.privacy}</Link>
      </p>
    </div>
  );
}

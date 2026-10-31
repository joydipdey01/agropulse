"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";

const KEY = "agropulse-cookie-notice";

export function CookieNotice() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;
  const accept = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // storage unavailable; just hide for this session
    }
    setShow(false);
  };

  return (
    <div role="region" aria-label={t.footer.cookies} className="animate-page fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-4 shadow-pop sm:inset-x-6 sm:bottom-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted">
          {t.cookieNotice.text}{" "}
          <Link href="/cookies" className="font-medium text-link underline-offset-4 hover:underline">
            {t.cookieNotice.learn}
          </Link>
        </p>
        <Button size="sm" onClick={accept}>
          {t.cookieNotice.accept}
        </Button>
      </div>
    </div>
  );
}

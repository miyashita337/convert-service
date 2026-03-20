"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

const STORAGE_KEY = "qc_cookie_consent";

export function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const tCommon = useTranslations("common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    window.dispatchEvent(
      new CustomEvent("cookie-consent-change", { detail: "accepted" }),
    );
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(STORAGE_KEY, "rejected");
    window.dispatchEvent(
      new CustomEvent("cookie-consent-change", { detail: "rejected" }),
    );
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          <p>{t("message")}</p>
          <p className="mt-1">
            {t.rich("learnMore", {
              privacyPolicy: (chunks) => (
                <Link
                  href="/privacy"
                  className="underline hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleReject}
            className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            {t("reject")}
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

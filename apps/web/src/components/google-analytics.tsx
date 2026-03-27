"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function hasConsentAccepted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("qc_cookie_consent") === "accepted";
  } catch {
    return false;
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const consentUpdatedRef = useRef(false);

  // Update consent when accepted (same-tab or cross-tab)
  useEffect(() => {
    const updateConsent = (granted: boolean) => {
      if (!granted || consentUpdatedRef.current) return;
      if (typeof window.gtag !== "function") return;
      consentUpdatedRef.current = true;
      window.gtag("consent", "update", {
        analytics_storage: "granted",
      });
    };

    updateConsent(hasConsentAccepted());

    const handleConsentChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      updateConsent(detail === "accepted");
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "qc_cookie_consent") {
        updateConsent(e.newValue === "accepted");
      }
    };

    window.addEventListener("cookie-consent-change", handleConsentChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(
        "cookie-consent-change",
        handleConsentChange,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Send pageview on SPA navigation
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    if (typeof window.gtag !== "function") return;

    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: pathname,
    });
  }, [pathname]);

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  const isDebug = process.env.NODE_ENV === "development";

  return (
    <>
      {/* Consent mode v2 defaults — must execute before gtag.js loads */}
      <Script id="gtag-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
          });
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            ${isDebug ? "debug_mode: true," : ""}
          });
        `}
      </Script>
    </>
  );
}

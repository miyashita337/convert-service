"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [consentGiven, setConsentGiven] = useState(false);

  // Check consent on mount and listen for consent changes
  useEffect(() => {
    setConsentGiven(hasConsentAccepted());

    // Same-tab consent changes via custom event
    const handleConsentChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setConsentGiven(detail === "accepted");
    };

    // Cross-tab consent changes via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "qc_cookie_consent") {
        setConsentGiven(e.newValue === "accepted");
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
    if (!consentGiven || !GA_MEASUREMENT_ID) return;
    if (typeof window.gtag !== "function") return;

    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: pathname,
    });
  }, [pathname, consentGiven]);

  // Don't render anything if no measurement ID or no consent
  if (!GA_MEASUREMENT_ID || !consentGiven) {
    return null;
  }

  const isDebug = process.env.NODE_ENV === "development";

  return (
    <>
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

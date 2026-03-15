"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { AD_LAYOUT } from "@/lib/ad-layout";

/** Global flag to enable/disable all ads (for maintenance or AdSense review). */
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== "false";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

type AdFormat = "auto" | "rectangle" | "leaderboard" | "mobile-banner";

interface AdBannerProps {
  /** AdSense ad unit slot ID */
  slot: string;
  /** Ad format */
  format?: AdFormat;
  /** Additional CSS classes */
  className?: string;
  /** Lazy load the ad (default: true) */
  lazy?: boolean;
}

const FORMAT_STYLES: Record<AdFormat, { width: string; height: string }> = {
  auto: { width: "100%", height: "auto" },
  rectangle: { width: "300px", height: "250px" },
  leaderboard: { width: "728px", height: "90px" },
  "mobile-banner": { width: "320px", height: "50px" },
};

const FORMAT_MIN_HEIGHTS: Record<AdFormat, string> = {
  auto: "90px",
  rectangle: "250px",
  leaderboard: "90px",
  "mobile-banner": "50px",
};

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

/** Send a GA4 custom event for ad performance measurement. */
function sendAdEvent(
  eventName: "ad_impression" | "ad_click",
  slot: string,
  format: AdFormat,
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  try {
    if (localStorage.getItem("qc_cookie_consent") !== "accepted") return;
  } catch {
    return;
  }
  window.gtag("event", eventName, {
    ad_slot: slot,
    ad_format: format,
    ad_layout: AD_LAYOUT,
  });
}

function AdSkeleton({ format }: { format: AdFormat }) {
  const minHeight = FORMAT_MIN_HEIGHTS[format];
  return (
    <div
      className="animate-pulse bg-muted/40 rounded"
      style={{ minHeight, width: "100%" }}
      aria-hidden="true"
    />
  );
}

export function AdBanner({
  slot,
  format = "auto",
  className,
  lazy = true,
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const pushed = useRef(false);
  const { isPaid, isLoading: subscriptionLoading } = useSubscription();

  // Don't render if ads are disabled or client ID is missing
  if (!ADS_ENABLED || !ADSENSE_CLIENT_ID) {
    return null;
  }

  // Hide ads for paid users (pass or subscription)
  if (isPaid) {
    return null;
  }

  // Don't render while checking subscription to prevent ad flash
  if (subscriptionLoading) {
    return null;
  }

  const style = FORMAT_STYLES[format];
  const adStyle =
    format === "auto"
      ? { display: "block" }
      : { display: "inline-block", width: style.width, height: style.height };

  // Push ad after script is loaded
  useEffect(() => {
    if (pushed.current) return;

    const tryPush = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
        setAdLoaded(true);
      } catch {
        setAdError(true);
      }
    };

    // If adsbygoogle is already available, push immediately
    if (window.adsbygoogle) {
      tryPush();
      return;
    }

    // Otherwise wait for script load event
    const handleLoad = () => tryPush();
    window.addEventListener("adsense-loaded", handleLoad);
    return () => window.removeEventListener("adsense-loaded", handleLoad);
  }, []);

  // Detect ad blocker: if ins element has 0 height after a delay, ads are blocked
  useEffect(() => {
    if (!adLoaded) return;

    const timer = setTimeout(() => {
      const el = adRef.current;
      if (el && el.offsetHeight === 0) {
        setAdError(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [adLoaded]);

  // GA4: Track ad_impression when the ad enters the viewport (50%+ visible)
  const impressionFired = useRef(false);
  useEffect(() => {
    if (!adLoaded || impressionFired.current) return;
    const el = adRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionFired.current) {
          impressionFired.current = true;
          sendAdEvent("ad_impression", slot, format);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [adLoaded, slot, format]);

  // GA4: Track ad_click when the ad container is clicked
  const handleAdClick = useCallback(() => {
    sendAdEvent("ad_click", slot, format);
  }, [slot, format]);

  // Ad blocked or errored: render empty space to prevent CLS
  if (adError) {
    return (
      <div
        className={className}
        style={{ minHeight: FORMAT_MIN_HEIGHTS[format] }}
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className={className} onClick={handleAdClick}>
      {/* AdSense script (loaded once globally via next/script) */}
      <Script
        id="adsense-script"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
        onLoad={() => {
          window.dispatchEvent(new Event("adsense-loaded"));
        }}
        onError={() => setAdError(true)}
      />

      {/* Skeleton while loading */}
      {!adLoaded && !adError && <AdSkeleton format={format} />}

      {/* AdSense ad unit */}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          ...adStyle,
          ...(adLoaded ? {} : { position: "absolute", opacity: 0 }),
        }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format === "auto" ? "auto" : undefined}
        data-full-width-responsive={format === "auto" ? "true" : undefined}
        {...(lazy ? { "data-ad-loading": "lazy" } : {})}
      />
    </div>
  );
}

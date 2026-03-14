"use client";

import Script from "next/script";

const CF_ANALYTICS_TOKEN = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

export function CfAnalytics() {
  if (!CF_ANALYTICS_TOKEN) {
    return null;
  }

  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token: CF_ANALYTICS_TOKEN })}
    />
  );
}

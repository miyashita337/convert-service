import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "export",

  // Generate source maps in production for Sentry error tracking.
  // Source maps are uploaded to Sentry via CI and NOT served to the browser.
  // Next.js static export does not include source maps in the output directory
  // unless explicitly copied, so they remain private.
  productionBrowserSourceMaps: true,
};

export default withNextIntl(nextConfig);

"use client";

import * as Sentry from "@sentry/browser";
import { buildSentryOptions } from "@quickconv/shared";

let initialized = false;

/**
 * Initialize Sentry for the client-side frontend.
 *
 * Uses @sentry/browser because the app uses static export (output: "export")
 * where @sentry/nextjs server features are unavailable.
 *
 * Safe to call multiple times — only the first call takes effect.
 * When NEXT_PUBLIC_SENTRY_DSN is not set, Sentry disables itself silently.
 */
export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const options = buildSentryOptions(dsn, "frontend");

  Sentry.init(options);
}

export { Sentry };

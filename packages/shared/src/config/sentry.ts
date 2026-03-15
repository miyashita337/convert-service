/**
 * Sentry shared configuration for all QuickConv layers.
 *
 * Single Sentry project "quickconv" — layers are distinguished
 * by the `environment` tag passed at SDK init time (frontend / api / converter).
 *
 * DSN is loaded from environment variables:
 *   Frontend : NEXT_PUBLIC_SENTRY_DSN
 *   API      : SENTRY_DSN  (wrangler.toml vars)
 *   Converter: SENTRY_DSN  (Cloud Run env)
 *
 * When the DSN is empty / undefined Sentry SDKs silently disable
 * themselves, so development environments work without configuration.
 */

/** Environment variable names per layer */
export const SENTRY_DSN_ENV = {
  frontend: "NEXT_PUBLIC_SENTRY_DSN",
  api: "SENTRY_DSN",
  converter: "SENTRY_DSN",
} as const;

/** Sentry layer identifiers used as the `environment` tag */
export type SentryLayer = "frontend" | "api" | "converter";

/**
 * Base Sentry configuration shared across all layers.
 *
 * Each layer's SDK init should spread these values and
 * override `dsn` / layer-specific options as needed.
 */
export const SENTRY_CONFIG = {
  /**
   * Performance monitoring sample rate.
   * 0.1 = 10 % of transactions — keeps us well within the free 5 K/month quota.
   */
  tracesSampleRate: 0.1,

  /**
   * Session Replay is not used (saves quota).
   */
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  /**
   * Only send events when a DSN is provided.
   * In development the DSN is typically omitted, which disables Sentry.
   */
  enabled: true,
} as const;

/**
 * Build a Sentry init options object for a given layer.
 *
 * @param dsn - The DSN string obtained from the appropriate env var.
 *              Pass `undefined` / empty string to disable Sentry.
 * @param layer - Which QuickConv layer is initializing ("frontend" | "api" | "converter").
 * @returns Options object suitable for `Sentry.init()`.
 */
export function buildSentryOptions(
  dsn: string | undefined,
  layer: SentryLayer,
) {
  const isEnabled = Boolean(dsn);

  return {
    dsn: dsn ?? "",
    environment: layer,
    enabled: isEnabled,
    tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
    replaysSessionSampleRate: SENTRY_CONFIG.replaysSessionSampleRate,
    replaysOnErrorSampleRate: SENTRY_CONFIG.replaysOnErrorSampleRate,
  };
}

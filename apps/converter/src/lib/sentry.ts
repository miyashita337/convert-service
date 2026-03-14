import * as Sentry from "@sentry/node";

const MEMORY_THRESHOLD = 0.8;

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log("SENTRY_DSN not set, Sentry disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || "converter",
    tracesSampleRate: 0.1,
  });

  initialized = true;
  console.log("Sentry initialized for converter");
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

export interface ConversionMetrics {
  conversionFormat: string;
  durationMs: number;
  fileSizeInput: number;
  fileSizeOutput: number;
}

export function addConversionBreadcrumb(metrics: ConversionMetrics): void {
  if (!initialized) return;

  Sentry.addBreadcrumb({
    category: "conversion",
    message: `Converted ${metrics.conversionFormat} in ${metrics.durationMs}ms`,
    level: "info",
    data: {
      conversion_format: metrics.conversionFormat,
      conversion_duration_ms: metrics.durationMs,
      file_size_input: metrics.fileSizeInput,
      file_size_output: metrics.fileSizeOutput,
    },
  });

  Sentry.withScope((scope) => {
    scope.setTags({
      conversion_format: metrics.conversionFormat,
    });
    scope.setExtras({
      conversion_duration_ms: metrics.durationMs,
      file_size_input: metrics.fileSizeInput,
      file_size_output: metrics.fileSizeOutput,
    });
  });
}

export function checkMemoryUsage(): void {
  if (!initialized) return;

  const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT_MB || "512", 10);
  const usage = process.memoryUsage();
  const usedMB = usage.rss / (1024 * 1024);
  const ratio = usedMB / memoryLimitMB;

  if (ratio > MEMORY_THRESHOLD) {
    Sentry.captureMessage(
      `Memory usage high: ${usedMB.toFixed(1)}MB / ${memoryLimitMB}MB (${(ratio * 100).toFixed(1)}%)`,
      "warning",
    );
  }
}

export { Sentry };

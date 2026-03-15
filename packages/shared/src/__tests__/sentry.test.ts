import { describe, it, expect } from "vitest";
import {
  SENTRY_CONFIG,
  SENTRY_DSN_ENV,
  buildSentryOptions,
} from "../config/sentry";

describe("SENTRY_DSN_ENV", () => {
  it("maps frontend to NEXT_PUBLIC_SENTRY_DSN", () => {
    expect(SENTRY_DSN_ENV.frontend).toBe("NEXT_PUBLIC_SENTRY_DSN");
  });

  it("maps api to SENTRY_DSN", () => {
    expect(SENTRY_DSN_ENV.api).toBe("SENTRY_DSN");
  });

  it("maps converter to SENTRY_DSN", () => {
    expect(SENTRY_DSN_ENV.converter).toBe("SENTRY_DSN");
  });
});

describe("SENTRY_CONFIG", () => {
  it("sets tracesSampleRate to 0.1 for cost minimization", () => {
    expect(SENTRY_CONFIG.tracesSampleRate).toBe(0.1);
  });

  it("disables session replay", () => {
    expect(SENTRY_CONFIG.replaysSessionSampleRate).toBe(0);
    expect(SENTRY_CONFIG.replaysOnErrorSampleRate).toBe(0);
  });
});

describe("buildSentryOptions", () => {
  it("returns enabled options when DSN is provided", () => {
    const opts = buildSentryOptions("https://key@sentry.io/123", "api");

    expect(opts.dsn).toBe("https://key@sentry.io/123");
    expect(opts.environment).toBe("api");
    expect(opts.enabled).toBe(true);
    expect(opts.tracesSampleRate).toBe(0.1);
  });

  it("disables Sentry when DSN is undefined", () => {
    const opts = buildSentryOptions(undefined, "frontend");

    expect(opts.dsn).toBe("");
    expect(opts.enabled).toBe(false);
  });

  it("disables Sentry when DSN is empty string", () => {
    const opts = buildSentryOptions("", "converter");

    expect(opts.dsn).toBe("");
    expect(opts.enabled).toBe(false);
  });

  it("sets environment to the given layer", () => {
    expect(buildSentryOptions("dsn", "frontend").environment).toBe("frontend");
    expect(buildSentryOptions("dsn", "api").environment).toBe("api");
    expect(buildSentryOptions("dsn", "converter").environment).toBe(
      "converter",
    );
  });
});

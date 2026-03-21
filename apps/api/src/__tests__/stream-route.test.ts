import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";

// Mock D1 database
const mockFirst = vi.fn();
const mockBind = vi.fn(() => ({ first: mockFirst }));
const mockPrepare = vi.fn(() => ({ bind: mockBind }));

const FAKE_ENV = {
  DB: { prepare: mockPrepare } as unknown as D1Database,
  R2_BUCKET: {} as R2Bucket,
  CORS_ORIGIN: "*",
  CONVERTER_URL: "http://converter:8080",
  CONVERTER_API_KEY: "test-key",
} as unknown as Env;

// Import stream route after mocks
import stream from "../routes/stream";

function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.route("/api/stream", stream);
  return app;
}

// Provide a fake ExecutionContext for waitUntil
const fakeExecutionCtx = {
  waitUntil: (promise: Promise<unknown>) => { promise.catch(() => {}); },
  passThroughOnException: () => {},
  props: {},
} as unknown as ExecutionContext;

describe("GET /api/stream/:jobId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SSE content-type header", async () => {
    mockFirst.mockResolvedValueOnce({
      status: "completed",
      progress: 100,
      output_file_key: "converted/abc.webp",
      error_message: null,
    });

    const app = createApp();
    const req = new Request("http://localhost/api/stream/test-job-id");
    const res = await app.fetch(req, FAKE_ENV, fakeExecutionCtx);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("streams completed job data correctly", async () => {
    mockFirst.mockResolvedValueOnce({
      status: "completed",
      progress: 100,
      output_file_key: "converted/abc.webp",
      error_message: null,
    });

    const app = createApp();
    const req = new Request("http://localhost/api/stream/test-job-id");
    const res = await app.fetch(req, FAKE_ENV, fakeExecutionCtx);
    const text = await res.text();

    const parsed = JSON.parse(text.replace("data: ", "").trim());
    expect(parsed.status).toBe("completed");
    expect(parsed.progress).toBe(100);
    expect(parsed.downloadUrl).toBe("/api/download/test-job-id");
  });

  it("streams failed job with error message", async () => {
    mockFirst.mockResolvedValueOnce({
      status: "failed",
      progress: 0,
      output_file_key: null,
      error_message: "Conversion timed out",
    });

    const app = createApp();
    const req = new Request("http://localhost/api/stream/test-job-id");
    const res = await app.fetch(req, FAKE_ENV, fakeExecutionCtx);
    const text = await res.text();

    const parsed = JSON.parse(text.replace("data: ", "").trim());
    expect(parsed.status).toBe("failed");
    expect(parsed.error).toBe("Conversion timed out");
  });

  it("returns not_found for missing job", async () => {
    mockFirst.mockResolvedValueOnce(null);

    const app = createApp();
    const req = new Request("http://localhost/api/stream/nonexistent");
    const res = await app.fetch(req, FAKE_ENV, fakeExecutionCtx);
    const text = await res.text();

    const parsed = JSON.parse(text.replace("data: ", "").trim());
    expect(parsed.status).toBe("not_found");
  });
});

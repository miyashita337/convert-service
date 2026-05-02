/**
 * Unit tests for converter service. Issue #275: ensure preview subrequest is
 * cancelled with a deterministic AbortSignal so a hung Cloud Run cold start
 * fails fast rather than letting the Worker tear the connection down — which
 * surfaces in the browser as a generic "Failed to fetch" TypeError.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { requestPreviewConversion } from "../services/converter";

describe("requestPreviewConversion", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("forwards a cancellable AbortSignal to the converter fetch", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ previews: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await requestPreviewConversion("http://converter", "k", {
      fileBody: new ArrayBuffer(8),
      fileName: "x.png",
      outputFormat: "webp",
      qualities: [70],
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  test("returns success=false on non-2xx without throwing", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));

    const result = await requestPreviewConversion("http://converter", "k", {
      fileBody: new ArrayBuffer(8),
      fileName: "x.png",
      outputFormat: "webp",
      qualities: [70],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });

  test("translates AbortError to a friendly error message", async () => {
    fetchMock.mockImplementationOnce(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    const result = await requestPreviewConversion("http://converter", "k", {
      fileBody: new ArrayBuffer(8),
      fileName: "x.png",
      outputFormat: "webp",
      qualities: [70],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to reach converter");
  });
});

/**
 * Tests for `requestPreview` retry/timeout behavior.
 *
 * Issue #275: "Compare Quality で Failed to fetch エラー" — transient browser
 * fetch TypeError must surface as a single retry, not an immediate failure.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { requestPreview } from "../lib/api-client";

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const errResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const sampleResponse = {
  previews: [{ quality: 70, size: 100, compressionRatio: 0.5, data: "data:image/webp;base64,AA" }],
  requestedCount: 1,
  returnedCount: 1,
  plan: "free",
};

const sampleFile = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "x.png", { type: "image/png" });

describe("requestPreview", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("returns parsed body on first success", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(sampleResponse));

    const promise = requestPreview(sampleFile(), "webp", [70], "free");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(sampleResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("retries once on transient TypeError (Failed to fetch)", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(okResponse(sampleResponse));

    const promise = requestPreview(sampleFile(), "webp", [70], "free");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(sampleResponse);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("does not retry on HTTP error (e.g. 400 validation)", async () => {
    fetchMock.mockResolvedValueOnce(
      errResponse(400, { message: "outputFormat is required" }),
    );

    // Attach the rejection handler BEFORE pumping timers so the promise is
    // never observed as unhandled while in fake-timer pump.
    const assertion = expect(
      requestPreview(sampleFile(), "webp", [70], "free"),
    ).rejects.toThrow("outputFormat is required");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("surfaces second failure when retry also fails", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const assertion = expect(
      requestPreview(sampleFile(), "webp", [70], "free"),
    ).rejects.toThrow("Failed to fetch");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("passes an AbortSignal so the request can time out", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(sampleResponse));

    const promise = requestPreview(sampleFile(), "webp", [70], "free");
    await vi.runAllTimersAsync();
    await promise;

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, consumeRateLimit } from "../services/rate-limit";
import * as repo from "../repositories/d1-rate-limit";

vi.mock("../repositories/d1-rate-limit");

const mockGetDailyCount = vi.mocked(repo.getDailyCount);
const mockIncrementDailyCount = vi.mocked(repo.incrementDailyCount);

describe("rate-limit service", () => {
  const fakeDb = {} as D1Database;
  const clientHash = "test-hash-abc";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkRateLimit", () => {
    it("returns allowed=true when under limit", async () => {
      mockGetDailyCount.mockResolvedValue({ dailyCount: 3, countDate: "2026-03-15" });

      const result = await checkRateLimit(fakeDb, clientHash);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7);
      expect(result.limit).toBe(10);
      expect(result.resetDate).toBe("2026-03-15");
    });

    it("returns allowed=false when at limit", async () => {
      mockGetDailyCount.mockResolvedValue({ dailyCount: 10, countDate: "2026-03-15" });

      const result = await checkRateLimit(fakeDb, clientHash);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("returns allowed=false when over limit", async () => {
      mockGetDailyCount.mockResolvedValue({ dailyCount: 15, countDate: "2026-03-15" });

      const result = await checkRateLimit(fakeDb, clientHash);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("does not call incrementDailyCount (read-only)", async () => {
      mockGetDailyCount.mockResolvedValue({ dailyCount: 0, countDate: "2026-03-15" });

      await checkRateLimit(fakeDb, clientHash);
      expect(mockIncrementDailyCount).not.toHaveBeenCalled();
    });
  });

  describe("consumeRateLimit", () => {
    it("increments and returns allowed=true when under limit", async () => {
      mockGetDailyCount.mockResolvedValue({ dailyCount: 3, countDate: "2026-03-15" });
      mockIncrementDailyCount.mockResolvedValue({ dailyCount: 4, countDate: "2026-03-15" });

      const result = await consumeRateLimit(fakeDb, clientHash);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(6);
      expect(mockIncrementDailyCount).toHaveBeenCalledWith(fakeDb, clientHash);
    });

    it("does not increment when at limit", async () => {
      mockGetDailyCount.mockResolvedValue({ dailyCount: 10, countDate: "2026-03-15" });

      const result = await consumeRateLimit(fakeDb, clientHash);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(mockIncrementDailyCount).not.toHaveBeenCalled();
    });

    it("returns remaining=0 when last allowed conversion", async () => {
      mockGetDailyCount.mockResolvedValue({ dailyCount: 9, countDate: "2026-03-15" });
      mockIncrementDailyCount.mockResolvedValue({ dailyCount: 10, countDate: "2026-03-15" });

      const result = await consumeRateLimit(fakeDb, clientHash);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });
});

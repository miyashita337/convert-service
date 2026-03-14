import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDailyCount, incrementDailyCount, getToday } from "../repositories/d1-rate-limit";

/** D1Database のモック */
function createMockDb() {
  const first = vi.fn();
  const run = vi.fn();
  const bind = vi.fn(() => ({ first, run }));
  const prepare = vi.fn(() => ({ bind }));
  return { prepare, bind, first, run } as unknown as D1Database & {
    first: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
    bind: ReturnType<typeof vi.fn>;
  };
}

describe("d1-rate-limit repository", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  describe("getToday", () => {
    it("returns a YYYY-MM-DD string", () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getDailyCount", () => {
    it("returns 0 when no record exists", async () => {
      const first = vi.fn().mockResolvedValue(null);
      const bind = vi.fn().mockReturnValue({ first });
      (db as any).prepare = vi.fn().mockReturnValue({ bind });

      const result = await getDailyCount(db as unknown as D1Database, "hash123");
      expect(result.dailyCount).toBe(0);
      expect(result.countDate).toBe(getToday());
    });

    it("returns 0 when count_date is not today", async () => {
      const first = vi.fn().mockResolvedValue({
        daily_count: 5,
        count_date: "2020-01-01",
      });
      const bind = vi.fn().mockReturnValue({ first });
      (db as any).prepare = vi.fn().mockReturnValue({ bind });

      const result = await getDailyCount(db as unknown as D1Database, "hash123");
      expect(result.dailyCount).toBe(0);
      expect(result.countDate).toBe(getToday());
    });

    it("returns the stored count when count_date is today", async () => {
      const today = getToday();
      const first = vi.fn().mockResolvedValue({
        daily_count: 7,
        count_date: today,
      });
      const bind = vi.fn().mockReturnValue({ first });
      (db as any).prepare = vi.fn().mockReturnValue({ bind });

      const result = await getDailyCount(db as unknown as D1Database, "hash123");
      expect(result.dailyCount).toBe(7);
      expect(result.countDate).toBe(today);
    });
  });

  describe("incrementDailyCount", () => {
    it("performs UPSERT and returns updated count", async () => {
      const run = vi.fn().mockResolvedValue({});
      const first = vi.fn().mockResolvedValue({ daily_count: 1 });
      const bind = vi.fn()
        .mockReturnValueOnce({ run }) // UPSERT
        .mockReturnValueOnce({ first }); // SELECT after
      (db as any).prepare = vi.fn().mockReturnValue({ bind });

      const result = await incrementDailyCount(db as unknown as D1Database, "hash456");
      expect(result.dailyCount).toBe(1);
      expect(result.countDate).toBe(getToday());
    });

    it("returns dailyCount 1 when SELECT returns null after UPSERT", async () => {
      const run = vi.fn().mockResolvedValue({});
      const first = vi.fn().mockResolvedValue(null);
      const bind = vi.fn()
        .mockReturnValueOnce({ run })
        .mockReturnValueOnce({ first });
      (db as any).prepare = vi.fn().mockReturnValue({ bind });

      const result = await incrementDailyCount(db as unknown as D1Database, "hash789");
      expect(result.dailyCount).toBe(1);
    });

    it("uses clientHash as the record id", async () => {
      const run = vi.fn().mockResolvedValue({});
      const first = vi.fn().mockResolvedValue({ daily_count: 3 });
      const bindForRun = vi.fn().mockReturnValue({ run });
      const bindForFirst = vi.fn().mockReturnValue({ first });
      const prepare = vi.fn()
        .mockReturnValueOnce({ bind: bindForRun })
        .mockReturnValueOnce({ bind: bindForFirst });
      (db as any).prepare = prepare;

      await incrementDailyCount(db as unknown as D1Database, "my-client-hash");

      // UPSERT query uses clientHash as first bind parameter
      expect(bindForRun.mock.calls[0][0]).toBe("my-client-hash");
      // SELECT query uses clientHash
      expect(bindForFirst.mock.calls[0][0]).toBe("my-client-hash");
    });
  });
});

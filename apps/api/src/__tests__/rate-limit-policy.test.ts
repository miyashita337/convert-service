import { describe, it, expect } from "vitest";
import {
  isDailyLimitExceeded,
  isFileSizeExceeded,
  isBatchLimitExceeded,
  ANONYMOUS_DAILY_LIMIT,
  ANONYMOUS_MAX_FILE_SIZE_BYTES,
  ANONYMOUS_MAX_BATCH_FILES,
} from "../domain/rate-limit-policy";

describe("rate-limit-policy", () => {
  describe("isDailyLimitExceeded", () => {
    it("returns false when count is below limit", () => {
      expect(isDailyLimitExceeded(0)).toBe(false);
      expect(isDailyLimitExceeded(ANONYMOUS_DAILY_LIMIT - 1)).toBe(false);
    });

    it("returns true when count equals limit", () => {
      expect(isDailyLimitExceeded(ANONYMOUS_DAILY_LIMIT)).toBe(true);
    });

    it("returns true when count exceeds limit", () => {
      expect(isDailyLimitExceeded(ANONYMOUS_DAILY_LIMIT + 1)).toBe(true);
    });
  });

  describe("isFileSizeExceeded", () => {
    it("returns false when size is within limit", () => {
      expect(isFileSizeExceeded(0)).toBe(false);
      expect(isFileSizeExceeded(ANONYMOUS_MAX_FILE_SIZE_BYTES)).toBe(false);
    });

    it("returns true when size exceeds limit", () => {
      expect(isFileSizeExceeded(ANONYMOUS_MAX_FILE_SIZE_BYTES + 1)).toBe(true);
    });
  });

  describe("isBatchLimitExceeded", () => {
    it("returns false when file count is within limit", () => {
      expect(isBatchLimitExceeded(1)).toBe(false);
      expect(isBatchLimitExceeded(ANONYMOUS_MAX_BATCH_FILES)).toBe(false);
    });

    it("returns true when file count exceeds limit", () => {
      expect(isBatchLimitExceeded(ANONYMOUS_MAX_BATCH_FILES + 1)).toBe(true);
    });
  });
});

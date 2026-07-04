import { describe, it, expect } from "vitest";

// AC-2 検証専用（Issue #378）: converter の 1 テストを意図的に失敗させ、
// matrix の converter leg 失敗 → test job 全体 failure → CI red を実証する。
// 検証後にこの draft PR ごと破棄する（本ファイルは main へは入らない）。
describe("AC-2 intentional failure (Issue #378, throwaway)", () => {
  it("fails on purpose to confirm converter leg turns CI red", () => {
    expect(1).toBe(2);
  });
});

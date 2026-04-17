import { describe, it, expect, vi, beforeEach } from "vitest";
import { upsertE2ETestUser } from "../repositories/user-repository";

function createMockDb() {
  const first = vi.fn();
  const run = vi.fn().mockResolvedValue({ success: true });
  const bind = vi.fn(() => ({ first, run }));
  const prepare = vi.fn(() => ({ bind }));
  return { prepare, bind, first, run } as unknown as D1Database & {
    first: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
    bind: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
  };
}

describe("upsertE2ETestUser", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("既存行あり → plan と updated_at を UPDATE（google_id は触らない）", async () => {
    db.first.mockResolvedValue({ stripe_customer_id: "existing-id" });

    await upsertE2ETestUser(db, "existing@example.com", "plus_monthly");

    // SELECT + UPDATE の2クエリ
    expect(db.prepare).toHaveBeenCalledTimes(2);
    const selectSql = db.prepare.mock.calls[0][0];
    const updateSql = db.prepare.mock.calls[1][0];
    expect(selectSql).toContain("SELECT stripe_customer_id FROM users WHERE email = ?");
    expect(updateSql).toContain("UPDATE users SET plan = ?");
    expect(updateSql).not.toContain("google_id");

    // UPDATE の bind 引数 (plan, email)
    expect(db.bind).toHaveBeenLastCalledWith("plus_monthly", "existing@example.com");
  });

  it("既存行なし → 決定論的 googleId で INSERT する", async () => {
    db.first.mockResolvedValue(null);

    await upsertE2ETestUser(db, "new@example.com", "free");

    // SELECT + INSERT
    expect(db.prepare).toHaveBeenCalledTimes(2);
    const insertSql = db.prepare.mock.calls[1][0];
    expect(insertSql).toContain("INSERT INTO users");
    expect(insertSql).toContain("google_id");

    // INSERT の bind 引数: (id, email, googleId, plan)
    const insertBind = db.bind.mock.calls[1];
    expect(insertBind[1]).toBe("new@example.com");
    expect(insertBind[2]).toBe("e2e-test:new@example.com");
    expect(insertBind[3]).toBe("free");
  });

  it("既存行の google_id を上書きしない（real user 保護）", async () => {
    db.first.mockResolvedValue({ stripe_customer_id: "real-customer-id" });

    await upsertE2ETestUser(db, "real@example.com", "pro_monthly");

    const updateSql = db.prepare.mock.calls[1][0];
    expect(updateSql).not.toContain("google_id");
    expect(db.bind).toHaveBeenLastCalledWith("pro_monthly", "real@example.com");
  });
});

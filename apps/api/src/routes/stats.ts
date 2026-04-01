import { Hono } from "hono";
import type { Env } from "../types/env";

const stats = new Hono<{ Bindings: Env }>();

stats.get("/", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM jobs WHERE status = 'completed'",
  ).first<{ count: number }>();

  return c.json({
    totalConversions: result?.count ?? 0,
  });
});

export default stats;

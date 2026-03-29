import { Hono } from "hono";
import type { Env } from "../types/env";

const stats = new Hono<{ Bindings: Env }>();

stats.get("/", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT COUNT(*) as total FROM jobs WHERE status = 'completed'"
  ).first<{ total: number }>();

  return c.json(
    { totalConversions: result?.total ?? 0 },
    200,
    { "Cache-Control": "public, max-age=300" },
  );
});

export default stats;

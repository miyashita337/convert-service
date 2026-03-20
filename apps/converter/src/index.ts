import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { initSentry } from "./lib/sentry";
import convertRoute from "./routes/convert";
import resizeRoute from "./routes/resize";

initSentry();

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/convert", convertRoute);
app.route("/resize", resizeRoute);

const port = parseInt(process.env.PORT || "8080", 10);

console.log(`Converter server starting on port ${port}`);
serve({ fetch: app.fetch, port });

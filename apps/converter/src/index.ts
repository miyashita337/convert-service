import { Hono } from "hono";
import { serve } from "@hono/node-server";
import convertRoute from "./routes/convert";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/convert", convertRoute);

const port = parseInt(process.env.PORT || "8080", 10);

console.log(`Converter server starting on port ${port}`);
serve({ fetch: app.fetch, port });

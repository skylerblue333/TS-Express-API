import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";

function allowedOrigins(): string[] | boolean {
  const configured = process.env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean);
  return configured && configured.length > 0 ? configured : false;
}

export const app: Express = express();
app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigins() }));
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_request: Request, response: Response) => {
  response.json({ status: "healthy", uptime: process.uptime() });
});

app.post("/api/data", (request: Request, response: Response) => {
  const body = request.body as { payload?: unknown };
  const payload = body?.payload;
  if (payload === undefined || payload === null || payload === "") {
    return response.status(400).json({ error: "payload is required" });
  }
  if (typeof payload !== "string" && (typeof payload !== "object" || Array.isArray(payload))) {
    return response.status(400).json({ error: "payload must be a string or object" });
  }
  return response.status(201).json({ received: payload, requestId: randomUUID(), timestamp: new Date().toISOString() });
});

if (require.main === module) app.listen(3000, () => console.log("API listening on port 3000"));
export default app;

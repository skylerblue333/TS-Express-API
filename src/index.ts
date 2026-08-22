import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type JsonObject = Record<string, unknown>;
type Payload = string | JsonObject;

type DataRecord = {
  id: string;
  payload: Payload;
  createdAt: string;
};

const maxPayloadBytes = 64 * 1024;
const dataStorePath = resolve(process.env.DATA_STORE_PATH ?? ".data/records.json");
let records: DataRecord[] = [];
let storeLoaded = false;

function allowedOrigins(): string[] | boolean {
  const configured = process.env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean);
  return configured && configured.length > 0 ? configured : false;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPayload(value: unknown): value is Payload {
  return (typeof value === "string" && value.length > 0) || isJsonObject(value);
}

async function loadStore(): Promise<void> {
  if (storeLoaded) return;
  try {
    const raw = await readFile(dataStorePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((item) => isJsonObject(item) && typeof item.id === "string" && typeof item.createdAt === "string" && isPayload(item.payload))) {
      throw new Error("data store has an invalid shape");
    }
    records = parsed as DataRecord[];
  } catch (error: unknown) {
    const code = isJsonObject(error) ? error.code : undefined;
    if (code !== "ENOENT") throw error;
    records = [];
  }
  storeLoaded = true;
}

async function persistStore(): Promise<void> {
  await mkdir(dirname(dataStorePath), { recursive: true });
  const temporaryPath = `${dataStorePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, dataStorePath);
}

function requestId(request: Request): string {
  return request.header("x-request-id")?.trim() || randomUUID();
}

export const app: Express = express();
app.disable("x-powered-by");
app.use((request, response, next) => {
  const id = requestId(request);
  response.setHeader("x-request-id", id);
  next();
});
app.use(cors({ origin: allowedOrigins() }));
app.use(express.json({ limit: maxPayloadBytes }));

app.get("/health", (_request: Request, response: Response) => {
  response.json({ status: "healthy", service: "ts-express-api", uptimeSeconds: Math.floor(process.uptime()) });
});

app.get("/metrics", async (_request: Request, response: Response) => {
  try {
    await loadStore();
    response.json({
      service: "ts-express-api",
      uptimeSeconds: Math.floor(process.uptime()),
      recordCount: records.length,
      memory: { rssBytes: process.memoryUsage().rss, heapUsedBytes: process.memoryUsage().heapUsed },
    });
  } catch {
    response.status(503).json({ error: "data store unavailable" });
  }
});

app.get("/ready", async (_request: Request, response: Response) => {
  try {
    await loadStore();
    response.json({ status: "ready", persistence: "file", recordCount: records.length });
  } catch {
    response.status(503).json({ status: "not_ready", persistence: "unavailable" });
  }
});

app.get("/api/data", async (request: Request, response: Response) => {
  const rawLimit = request.query.limit;
  const limit = rawLimit === undefined ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return response.status(400).json({ error: "limit must be an integer between 1 and 100" });

  try {
    await loadStore();
    const result = records.slice(-limit).reverse();
    return response.json({ items: result, count: result.length, limit });
  } catch {
    return response.status(503).json({ error: "data store unavailable" });
  }
});

app.post("/api/data", async (request: Request, response: Response) => {
  const body: unknown = request.body;
  const payload = isJsonObject(body) ? body.payload : undefined;
  if (!isPayload(payload)) return response.status(400).json({ error: "payload must be a non-empty string or object" });

  try {
    await loadStore();
    const record: DataRecord = { id: randomUUID(), payload, createdAt: new Date().toISOString() };
    records.push(record);
    await persistStore();
    return response.status(201).json({ ...record, received: payload });
  } catch {
    return response.status(503).json({ error: "data store unavailable" });
  }
});

app.get("/api/data/:id", async (request: Request, response: Response) => {
  try {
    await loadStore();
    const record = records.find((item) => item.id === request.params.id);
    return record ? response.json(record) : response.status(404).json({ error: "record not found" });
  } catch {
    return response.status(503).json({ error: "data store unavailable" });
  }
});

if (require.main === module) app.listen(Number(process.env.PORT ?? 3000), () => console.log("API listening"));
export default app;

import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
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
let persistTail: Promise<void> = Promise.resolve();

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
  const snapshot = `${JSON.stringify(records, null, 2)}\n`;
  persistTail = persistTail.then(async () => {
    await mkdir(dirname(dataStorePath), { recursive: true });
    const temporaryPath = `${dataStorePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, snapshot, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, dataStorePath);
  });
  return persistTail;
}

function requestId(request: Request): string {
  const incoming = request.header("x-request-id")?.trim();
  return incoming && incoming.length <= 128 ? incoming : randomUUID();
}

function runtimePort(): number {
  const configured = Number(process.env.PORT ?? 3000);
  return Number.isInteger(configured) && configured >= 1 && configured <= 65535 ? configured : 3000;
}

export const app: Express = express();
app.disable("x-powered-by");
app.use((request, response, next) => {
  const id = requestId(request);
  const started = process.hrtime.bigint();
  response.setHeader("x-request-id", id);
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "no-referrer");
  response.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    console.log(JSON.stringify({ event: "request", requestId: id, method: request.method, path: request.path, status: response.statusCode, durationMs: Math.round(elapsedMs * 100) / 100 }));
  });
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

app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: "route not found" });
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: "invalid JSON payload" });
    return;
  }
  console.error(JSON.stringify({ event: "request_error", message: error instanceof Error ? error.message : "unknown error" }));
  response.status(500).json({ error: "internal server error" });
});

if (require.main === module) {
  const port = runtimePort();
  app.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "start", service: "ts-express-api", port })));
}
export default app;

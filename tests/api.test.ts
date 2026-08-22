import request from "supertest";
import app from "../src/index";

describe("Express API", () => {
  it("GET /health returns 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("GET /metrics reports measured runtime and record facts", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ service: "ts-express-api", uptimeSeconds: expect.any(Number), recordCount: expect.any(Number) }));
    expect(res.body.memory).toEqual(expect.objectContaining({ rssBytes: expect.any(Number), heapUsedBytes: expect.any(Number) }));
  });

  it("GET /ready reports file persistence", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: "ready", persistence: "file" }));
  });

  it("POST /api/data persists a typed string and GET retrieves it", async () => {
    const created = await request(app).post("/api/data").send({ payload: "test_data" });
    expect(created.status).toBe(201);
    expect(created.body.received).toBe("test_data");
    expect(created.body.id).toEqual(expect.any(String));
    expect(created.body.createdAt).toEqual(expect.any(String));

    const fetched = await request(app).get(`/api/data/${created.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(expect.objectContaining({ id: created.body.id, payload: "test_data" }));
  });

  it("GET /api/data lists newest records first and enforces limit bounds", async () => {
    const first = await request(app).post("/api/data").send({ payload: "first" });
    const second = await request(app).post("/api/data").send({ payload: "second" });
    const listed = await request(app).get("/api/data?limit=1");
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual({ items: [expect.objectContaining({ id: second.body.id, payload: "second" })], count: 1, limit: 1 });
    expect((await request(app).get("/api/data?limit=0")).status).toBe(400);
    expect((await request(app).get("/api/data?limit=101")).status).toBe(400);
    expect(first.body.id).not.toBe(second.body.id);
  });

  it("POST /api/data persists an object payload", async () => {
    const res = await request(app).post("/api/data").send({ payload: { source: "integration-test", version: 1 } });
    expect(res.status).toBe(201);
    expect(res.body.payload).toEqual({ source: "integration-test", version: 1 });
  });

  it("POST /api/data rejects missing and scalar payloads", async () => {
    expect((await request(app).post("/api/data").send({})).status).toBe(400);
    expect((await request(app).post("/api/data").send({ payload: 42 })).status).toBe(400);
    expect((await request(app).post("/api/data").send({ payload: [] })).status).toBe(400);
  });

  it("GET /api/data/:id returns 404 for an unknown record", async () => {
    const res = await request(app).get("/api/data/does-not-exist");
    expect(res.status).toBe(404);
  });
});

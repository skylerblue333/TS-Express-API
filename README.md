# TypeScript Express API

A small, typed Express service that provides a verifiable foundation for server-side data ingestion. It is an executable service slice, not the SKYCOIN4444 ecosystem backend and not a claim of enterprise production readiness.

## Implemented behavior

`GET /health` returns a liveness response and an `x-request-id` response header. `GET /metrics` reports measured process uptime, memory usage, and persisted-record count; it does not contain business or user metrics. `GET /ready` loads and validates the configured file store and reports the current persistence mode. `POST /api/data` accepts a non-empty string or JSON object under `payload`, rejects unsupported or missing values, limits JSON bodies to 64 KB, writes a typed record using an atomic temporary-file rename, returns its generated ID and timestamp, and preserves the legacy `received` response field. `GET /api/data?limit=N` lists up to 100 newest records first, defaulting to 50, and rejects invalid limits. `GET /api/data/:id` retrieves a persisted record or returns `404`.

The service uses `DATA_STORE_PATH` when provided and otherwise writes to `.data/records.json`. The store is intentionally simple and local; it does not claim multi-process database semantics.

## Run locally

```bash
pnpm install
DATA_STORE_PATH=/var/lib/skycoin-api/records.json CORS_ORIGINS=https://app.example.com pnpm build
DATA_STORE_PATH=/var/lib/skycoin-api/records.json CORS_ORIGINS=https://app.example.com pnpm start
```

If `CORS_ORIGINS` is not configured, cross-origin requests are not enabled. Do not place secrets, private keys, seed phrases, or personal data in payloads.

## Validation

```bash
pnpm build
DATA_STORE_PATH=/tmp/skycoin-api-test.json pnpm test
```

The test suite covers health and request IDs, readiness, string and object ingestion, persistence and retrieval, validation failures, and unknown-record handling. The Dockerfile builds from the lockfile and runs the compiled service as a non-root user.

## Scope and limitations

This service does not implement authentication, authorization, rate limiting, a relational database, migrations, encryption at rest, backups, audit logging, OpenAPI documentation, queues, external integrations, or deployment automation. It must not be exposed as a public production API until those controls are implemented and reviewed. It does not represent cryptocurrency balances, transactions, wallet custody, user identity, AI capability, or production metrics.

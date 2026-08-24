# Sky Express Data API

**Status: engineering beta.** This repository is a small typed Express service for durable single-process JSON data ingestion. It is independently deployable and intentionally does not claim to be the full SKYCOIN4444 backend.

## Implemented behavior

- `GET /health` returns process liveness, uptime, a bounded `x-request-id`, and baseline security headers.
- `GET /ready` loads and validates the configured file store and reports readiness.
- `GET /metrics` reports process uptime, memory use, and persisted-record count only.
- `POST /api/data` accepts a non-empty string or JSON object under `payload`, limits JSON request bodies to 64 KB, writes a typed record, and returns its generated ID and timestamp.
- `GET /api/data?limit=N` lists newest records first with a validated 1–100 limit.
- `GET /api/data/:id` retrieves one record or returns JSON `404`.
- Malformed JSON and unknown routes return structured JSON errors rather than Express HTML error pages.

The file writer serializes persistence operations and uses an atomic temporary-file rename. `DATA_STORE_PATH` selects the data file; the default is `.data/records.json`. This is a single-process persistence mechanism, not a database or distributed consistency system.

An OpenAPI description is provided in `openapi.json`; treat the tested application behavior as authoritative if documentation and implementation ever diverge.

## Run locally

Requires Node.js 22 and pnpm 11.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
DATA_STORE_PATH=/tmp/sky-express-records.json pnpm test
DATA_STORE_PATH=.data/records.json PORT=3000 pnpm start
```

Set `CORS_ORIGINS` to a comma-separated allowlist when browser cross-origin access is required. When it is absent, cross-origin access is disabled by default.

## Verification

GitHub Actions verifies:

- frozen-lockfile installation
- TypeScript build/type checking
- integration tests
- production dependency audit at high severity
- Docker build
- non-root runtime user
- an actual container boot followed by `/health` smoke testing

The smoke test is important: it verifies the runtime image contains the production dependencies required by Express and CORS.

## Container

```bash
docker build -t sky-express .
docker run --rm -p 3000:3000 -v "$PWD/.data:/app/.data" sky-express
```

The image runs as the unprivileged `app` user.

## SKYCOIN4444 integration

Use the HTTP/OpenAPI contract through the ecosystem gateway when a simple ingestion service is useful. Keep this repository independently versioned and deployable rather than copying its implementation into a flagship repository.

## Security and limitations

The service sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, request IDs, strict CORS defaults, a JSON body limit, and non-root container execution. It does **not** implement authentication, authorization, tenant isolation, rate limiting, encryption at rest, backups, multi-process locking, HA, or production deployment. Do not store secrets, wallet material, or sensitive personal data in this engineering-beta file store.

See `SECURITY.md` for reporting guidance and boundaries.

## License

See `LICENSE`.

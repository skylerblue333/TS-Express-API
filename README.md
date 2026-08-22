# TypeScript Express API

A small Express API exposing a health endpoint and a bounded data-ingestion example. It is a focused service boundary, not a Mongoose-backed REST platform or a deployed enterprise API.

## Implemented behavior

`GET /health` reports service health and process uptime. `POST /api/data` accepts a non-empty string or object under `payload`, rejects unsupported or missing values, limits JSON bodies to 64 KB, returns a generated request ID, and uses an allowlisted `CORS_ORIGINS` configuration when provided. With no allowlist configured, cross-origin requests are not enabled.

```bash
pnpm install
CORS_ORIGINS=https://app.example.com pnpm run build
CORS_ORIGINS=https://app.example.com pnpm start
```

## Validation

```bash
pnpm run build
pnpm test --runInBand
```

The repository’s tests cover health, accepted payloads, and missing-payload errors. The current production dependency audit reports no vulnerabilities; development dependency alerts still require maintenance review.

## Scope and limitations

This repository does not implement persistence, authentication, authorization, rate limiting, request schema versioning, OpenAPI/Swagger documentation, queueing, or deployment automation. It must not be used as a public production API until those controls are implemented and reviewed. The former Mongoose, Swagger, “professional-grade,” “scalable,” and “cloud-native” claims were removed because the source does not substantiate them.

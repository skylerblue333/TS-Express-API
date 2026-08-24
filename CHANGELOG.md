# Changelog

## 1.1.0 - 2026-08-24

- Fixed the production container so runtime Express/CORS dependencies are present.
- Added a runtime container health smoke test and non-root verification to CI.
- Added production dependency auditing and aligned CI on Node 22 / pnpm 11.
- Added baseline security headers, structured request logging, bounded incoming request IDs, JSON 404/error responses, and safe port fallback.
- Serialized file persistence writes while retaining atomic rename behavior.
- Expanded integration tests and documented the existing OpenAPI contract and product limits.

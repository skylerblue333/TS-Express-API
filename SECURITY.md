# Security Policy

## Supported status

Sky Express Data API is an engineering-beta service. Security fixes target the current `main` line after verification.

## Reporting

Report suspected vulnerabilities privately to the repository owner rather than publishing exploit details in a public issue.

## Current controls

The application disables the Express signature header, uses bounded request IDs, explicit CORS configuration, JSON body limits, JSON error responses, baseline browser security headers, and a non-root container. CI audits production dependencies and boots the built image before merge.

## Explicit boundaries

Authentication, authorization, tenant isolation, rate limiting, TLS termination, encryption at rest, durable audit logging, backups, HA, and multi-process data-store locking are outside the current implementation. Place the service behind an authenticated gateway and durable data tier before using it for sensitive or production traffic.

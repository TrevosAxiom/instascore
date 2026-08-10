# Security decisions

Milestone 2 validates UUID relationships, competition enums, UTC dates and
bounded scalar rule objects. Writes use nonce, capability and assignment
checks, soft archival, transactional audits and HMAC-hashed client IPs.

- Server secrets are environment variables or WordPress constants and never
  `VITE_*` values.
- Future REST writes require authentication, WordPress nonce where applicable,
  capability and assignment-scope checks, schema validation and sanitization.
- Output escaping happens at the last responsible boundary.
- Public APIs use UUIDs, pagination, rate limits and structured errors.
- Multi-record writes use transactions; event/import/job idempotency keys are
  unique; sensitive changes emit append-only audit records.
- Logs redact credentials and personal data. Uploads require MIME, size and
  capability validation.
- No uninstall data deletion is implemented until retention and confirmation
  policy are approved.
- WordPress session cookies remain authoritative. React sends same-origin
  credentials and `X-WP-Nonce`; it stores no password or bearer token.
- Authentication output uses generated UUIDs instead of sequential WordPress
  user IDs.
- The public health response excludes environment, filesystem, database and
  credential details.

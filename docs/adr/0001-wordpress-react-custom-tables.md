# ADR-0001: WordPress, React SPA and custom tables

- Status: Accepted for foundation
- Date: 2026-07-30

## Decision

Use a custom WordPress plugin for backend integration, authentication,
capabilities and administration; a React/TypeScript SPA bundled by Vite for
public and operational interfaces; and versioned custom MySQL tables for
high-volume relational sports data.

## Rationale

WordPress supplies mature identity and hosting compatibility. React supports
the compact, stateful mobile workflows shown by the prototype. Posts and post
meta are unsuitable as the authoritative store for fixtures, event streams,
standings and fantasy calculations because their query shape, constraints and
indexes do not match the domain.

## Consequences

The plugin must own migrations, REST contracts, permissions, cache invalidation
and uninstall policy. PHP and TypeScript need separate but aligned validation.
Deployment must publish a Vite manifest and load hashed assets through
WordPress. Database portability is limited to MySQL/MariaDB-compatible hosts.

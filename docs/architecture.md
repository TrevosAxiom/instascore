# Architecture

Milestone 2 REST controllers translate UUID-facing requests into repository
calls. Services own validation, transactions and audit creation. Repositories
alone issue custom-table SQL. Public reads use bounded pagination and ETags.

## Context

InstaScore is a mobile-first multi-sport platform hosted by WordPress. The
custom `instascore-platform` plugin owns the domain, REST API, migrations and
SPA assets. WordPress remains the identity and administration host; sports data
uses normalized custom tables.

## Boundaries

- `includes/`: future PHP application code, split into Database, REST, Auth,
  Domain, Services, Repositories, Jobs, Providers, Notifications, Fantasy and
  Support namespaces.
- `src/`: future React TypeScript app, split by application shell, routes,
  reusable UI and domain features.
- `templates/`: future WordPress mount templates.
- `public/`: future static assets. PWA and OneSignal workers are explicitly
  deferred.
- `tests/`: PHP unit/integration, frontend unit/component and end-to-end suites.

## Runtime flow

WordPress authenticates users and serves a dedicated SPA mount. React calls
`/wp-json/instascore/v1`; REST controllers validate transport data and delegate
to services; services enforce domain rules and transactions; repositories own
queries. Domain events feed background jobs. Public live reads initially poll
through a transport abstraction.

## Cross-cutting rules

- UTC storage, user-timezone presentation.
- UUIDs in public contracts; numeric keys internally.
- Append-oriented match events and immutable audit history.
- Capability checks and assignment scope on every mutation.
- Pagination, indexed queries, consistent API envelopes.
- Feature routes display reusable empty states until their owning milestones.
- Authoritative standings, scoring and fantasy calculations run server-side.

See [ADR-0001](adr/0001-wordpress-react-custom-tables.md), the
[database plan](database-plan.md) and [security plan](security.md).

## Milestone 1 implementation

- `Bootstrap` registers runtime hooks.
- `Activation` runs migrations and grants shell capabilities; `Deactivation`
  clears the reserved job hook without deleting data.
- `MigrationRunner` executes ordered, checksummed migrations under a lock.
- `Assets` loads Vite modules from development or the production manifest only
  on pages containing `[instascore_app]`.
- React providers own error isolation, TanStack Query, the typed API client,
  authentication state and Material UI theme.
- BrowserRouter uses the shortcode page path as its basename.

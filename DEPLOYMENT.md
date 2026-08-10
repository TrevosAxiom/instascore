# InstaScore Git deployment

This repository contains only the `instascore-platform` WordPress plugin. WordPress core,
uploads, site configuration, API keys and environment files must never be committed here.

## Production contents

The compiled `dist/` directory is committed intentionally. The live server can therefore
pull a tested commit without installing Node.js or building frontend assets in production.
`node_modules/`, development-only Composer dependencies in `vendor/`, test output, local
environment files and logs remain ignored.

## Local release workflow

1. Make plugin changes locally.
2. Run `pnpm check` and review the generated `dist/` changes.
3. Commit the source and matching `dist/` output together.
4. Push the commit to the central Git remote.

## First live-server checkout

Back up the current plugin directory and database before the first deployment. Then clone
the repository directly into `wp-content/plugins/instascore-platform` using a deploy key
that has read-only access to the repository. Do not store the private deploy key inside the
web root.

## Updating the live plugin

From the plugin directory on the live server:

```sh
git fetch --prune origin
git pull --ff-only origin main
```

Use `--ff-only` so a production-side edit cannot silently create a merge commit. Production
files should never be edited directly; make every change locally, test it, commit it and pull
that commit on the server.

After a pull, clear the page/CDN cache and confirm `/instascore.webmanifest`, the service
worker and the homepage are serving the new build. Plugin database migrations run through
the normal WordPress bootstrap when the plugin version changes.

## Rollback

Deploy a known-good commit explicitly rather than deleting files or resetting blindly:

```sh
git log --oneline --max-count=10
git switch --detach <known-good-commit>
```

After diagnosing the issue, return to the tracked branch with `git switch main` and pull the
corrected release.

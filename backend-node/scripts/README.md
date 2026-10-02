# Disposable CMS verification fixtures

`seed-test-cms-admins.js` is an explicit test command, never application bootstrap.
It uses Strapi's native role and user services, including native password hashing.
The editor has only `plugin::alageum-catalog.manage`; the second administrator has
no catalog permission. Neither identity is a B2B user or a Strapi Super Admin.

The command requires `APP_ENV=test`, `ALAGEUM_TEST_ADMIN_FIXTURES=1`, a loopback
PostgreSQL URL naming an allowlisted isolated test database, and independently
generated `E2E_CMS_EDITOR_PASSWORD` / `E2E_CMS_DENIED_PASSWORD` values. It verifies
the connected database and refuses existing administrators rather than resetting
their credentials or widening permissions. CI/local browser checks use their own
fresh `alageum_strapi_browser_test` database, separate from integration fixtures.

No password is printed or written by the helper. CI masks its generated values;
test-only browser traces can contain short-lived test sessions. Do not use real
credentials, production databases, or persistent administrator accounts here.

The native CMS login UI is `/cms/auth/login`; the guarded editor is
`/cms/plugins/alageum-catalog`. Pinned Strapi 5.56 still serves authentication APIs
under `/admin`, while its browser UI reads the access cookie under `/cms`. Their
shared cookie path is therefore `/`, not `/cms` or `/admin`. Cookies remain
host-only: a dedicated backend/CMS origin is a production prerequisite, rather
than placing unrelated applications on the same host. The `secure` option is
intentionally not overridden: Strapi 5.56 sets
Secure on production HTTPS requests, and isolated test HTTP needs no globally
weakened cookie setting. Rebuild the admin bundle when cookie/path config changes.

The fixture guard and least-privilege behavior have dependency-free unit tests:

```sh
node --test tests/cms-fixtures.test.js
```

They are also included in the normal `npm run check` / `npm test` glob.

The fixture CLI awaits native administrator metrics started by user creation
before closing Strapi. This prevents an unawaited count query from racing pool
shutdown, even when telemetry is disabled; metric failures still propagate.
`run-local-tests.sh --fixtures-only` verifies the actual CLI in a new isolated
cluster without building or launching the browser.

## Separate company-profile fixtures

`bash backend-node/scripts/run-profile-tests.sh --browser` (from repository root)
creates a new local PostgreSQL cluster and the exact `alageum_strapi_profile_test`
database, starts actual Strapi, creates only fictitious B2B profile users, builds
Next into `.next-profile`, and runs the explicit 16-case desktop/mobile profile
suite. Set `PG_BIN` to the installed PostgreSQL 16+ binaries and use Node 24 with
locked dependencies and Playwright Chromium already installed. The runner ignores
the caller's database URL and generates fresh runtime secrets/passwords.

`--backend-only` runs the real HTTP fixture/permission/persistence/conflict checks
without a browser or frontend build. It is a local diagnostic mode; CI rejects it
so a partial pass cannot be mistaken for browser acceptance. Existing default 45
and optional webpack 4 browser cases keep their original scopes.

`seed-test-profile-users.js` requires `APP_ENV=test`,
`ALAGEUM_TEST_PROFILE_FIXTURES=1`, an explicit long disposable
`E2E_PROFILE_PASSWORD`, and the exact loopback test database. Its CLI preflight
refuses any existing application tables before Strapi synchronization. Seeding
refuses existing B2B rows/CMS administrators and creates dedicated role grants;
existing/demo roles are never widened. Do not run it on any customer database.

The runner prints the sanitized evidence directory. Share only its sanitized
logs/results and explicitly captured fictitious saved-state PNGs; never raw
databases, credentials, cookies, tokens or network traces. See
[`docs/company-profile.md`](../../docs/company-profile.md) for contract and limits.

## Separate customer support fixtures

`bash backend-node/scripts/run-support-tests.sh --browser` creates a new loopback
PostgreSQL cluster and the exact `alageum_strapi_support_test` database. Before
constructing Strapi it rejects wrong/shared/nonfresh databases; fixtures refuse
reseeding and never widen default roles. All users and ticket text are fictitious.

Acceptance consists of 21 real HTTP/PostgreSQL checks, a dedicated `.next-support`
production build and 20 desktop/mobile browser cases with four explicit PNGs.
`--backend-only` is a local diagnostic mode and is forbidden in CI. The runner
prints a sanitized evidence directory; only that directory's sanitized reports,
logs and explicit PNGs may be shared. Never share the sibling database cluster,
credentials or browser authentication traces. See
[`docs/node-support-tickets.md`](../../docs/node-support-tickets.md) for the
three-route boundary, non-idempotent submission behavior and exact evidence gate.

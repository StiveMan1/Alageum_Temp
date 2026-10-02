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

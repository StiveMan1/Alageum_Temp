# Frozen generic quote application reference

This is a **test-only proof gate**, not a Node route/schema implementation. The
manifest pins 86 application, migration and lock files to
`8f8bd11a942e50686d7f8bbd52e1bb5ba3d9721a` (PR24). Test additions do not redefine
that oracle. Existing model, stubbed-ASGI, native-parser and minimal-PG reports
remain separate evidence.

The runner uses the actual FastAPI app and lifespan, middleware/error handlers,
password login/JWT/refresh sessions, authority dependencies, SQLAlchemy and
asyncpg. Transport is **in-process ASGI + ORM + loopback PostgreSQL**. There is no
deployed HTTP listener, proxy/TLS proof or network client simulator.

## Execution

Use an unprivileged Linux CI account, Python 3.12, PostgreSQL `initdb`, `pg_ctl`
and `postgres` from one declared installation, and the repository's existing
locked install pattern:

```sh
cd backend
pip install -r requirements-dev.lock
python tests/reference/run_generic_quote_reference.py \
  --postgres-bin /usr/lib/postgresql/16/bin \
  --output "$RUNNER_TEMP/generic-quote-reference-report.json"
```

The PostgreSQL path is the CI installation, not a download instruction. The
report records the actual server version and executable hashes; it must not be
described as the earlier PG17.11 minimal-schema run if a different server is used.
All 72 installed distribution versions must match the frozen dev lock. No package
installation occurs in either harness script.

The output path must not exist. Port `127.0.0.1:39203` must be free. The runner
never accepts a database URL or reuses a PostgreSQL service. It creates a private
cluster and the exact new `generic_quote_reference_test` database, proves its
identity and absence of user relations before migration, and runs the actual
Alembic chain to `f05b719aec42`. Repository dotenv files cause refusal. Inherited
APP/PG/database configuration is excluded from subprocess environments.

The cluster owner runs migrations and synthetic fixture setup. The application
uses a separate non-owner role with bounded table grants, no schema creation,
superuser, role/database creation, or row-security bypass. Passwords, signing
secret and ownership nonce are generated per invocation; only the owned fixture
is removed after verified shutdown. No pre-existing database, real data, external
service, production grant, frontend file, dependency lock or application source
is changed.

For a source/AST check without installed runtime dependencies or PostgreSQL:

```sh
python backend/tests/reference/run_generic_quote_reference.py --verify-only
```

That command does **not** execute the application or establish endpoint parity.
Normal `pytest` collection does not run this standalone proof. Its parent
`tests/conftest.py` would replace migrations with ORM tables and clear the limiter,
so this runner intentionally bypasses pytest entirely.

## Bounded coverage and evidence

The finite corpus currently makes 80 quote endpoint requests and four actual
login requests. A hard guard permits at most 100 quote requests; the parent
runner kills the case process after 180 seconds following setup. No POST is
automatically retried. Independent cases use declared synthetic ASGI peer
addresses. The shared-quota group uses one peer, unchanged 10-per-60-second
runtime policy, and a natural approximately 61-second expiry wait. No dependency
override, stubbed endpoint, limiter reset, policy mutation or fake clock is used.

Coverage includes nullable/repeated/global hidden/draft products, parameters,
generic defaults and audit identity, scoped reads, ignored idempotency headers,
Numeric rounding/check/overflow, exact JSON integer versus float decoding,
non-finite/NUL/surrogate and Unicode outcomes, UUID/extras/nullability and item
bounds, real authority denial, and generic/catalog quota order. Catalog controls
prove create/replay/conflict and snapshots in the shared bucket. A middle-item
FK/quantity failure and narrow temporary audit rejection trigger prove real
transaction rollback without replacing app functions. This is finite evidence,
not exhaustive parsing, concurrency, deployment or production readiness proof.

The runner asserts observed status/error code/message/request ID and committed
SQL state. Storage/serialization failure cases intentionally expect the frozen
500 `internal_error` envelope where applicable; an unexpected result fails the
gate and remains in the sanitized report for review, never silently replacing
the expectation. FK failures must also emit SQLSTATE `23503`, rounded-zero/check
failures `23514`, and numeric overflows `22003`. Audit rollback must emit `23514`
with the deliberately assigned `reference_audit_rejection` constraint identifier.
A generic 500 or unrelated grant failure cannot satisfy these database-fault
checks. Constraint capture is restricted to three known schema/fixture names;
driver exception text and SQL parameters are never retained.

Only the JSON report is a publication artifact: provenance, selected synthetic
results, statuses, selected response headers, validation locations/types,
SQLSTATE/type, counts, assertion outcomes and lifecycle. It excludes raw request
headers, cookies, tokens, passwords, environment, exception text/tracebacks,
server/application logs and database archives. Sanitized request checkpoints are
retained on assertion failure or timeout. SIGINT and SIGTERM record a sanitized
interruption phase and enter cleanup. An active case child is terminated, given
five seconds to exit, then killed and given another five seconds to be reaped.
Its exit must be verified before cluster shutdown or fixture removal. PostgreSQL
shutdown has a 30-second subprocess bound; subsequent signals do not interrupt
cleanup. Give the outer workflow timeout at least 60 seconds of cleanup grace.

The final report is published atomically only after cleanup; `passed` requires
verified cases, child exit, server shutdown and fixture removal, with no handled
interruption. Cleanup failure makes the gate fail and preserves any fixture that
cannot safely be removed. SIGKILL, host loss and forced CI teardown cannot run
Python cleanup: they can leave an owned temporary fixture or child until the
disposable CI machine is reclaimed. A kill before final publication leaves no
complete final report, never a passing cleanup claim. An already published pass
means all those checks and cleanup finished before publication.

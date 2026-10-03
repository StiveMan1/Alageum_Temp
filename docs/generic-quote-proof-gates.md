# Generic quote compatibility proof gates

This checkpoint adds reference verification, not a generic Node endpoint or a
new application schema. The frozen application oracle is PR24 commit
`8f8bd11a942e50686d7f8bbd52e1bb5ba3d9721a`. The Node compatibility route remains
unavailable until the separate design and implementation gates pass.

## Actual legacy application reference

The standalone runner under `backend/tests/reference` executes the actual
FastAPI application and lifespan, real password authentication, authority
dependencies, SQLAlchemy and asyncpg against a newly owned PostgreSQL cluster.
It runs the existing Alembic migration chain and verifies its head. Application
source hashes and installed package versions are checked against the pinned
manifest; no production code is replaced.

The transport is in-process ASGI with declared synthetic peer identities. This
proves application/ORM/database behavior, not a deployed HTTP listener, proxy,
TLS or network decompression. The fixture avoids the ordinary pytest autouse
setup, which recreates tables and clears the limiter between tests. No limiter
reset, fake clock, automatic POST retry or dependency override is used here.

The corpus is bounded by 100 quote endpoint requests and a 180-second case
process deadline after setup. It includes a real quota expiry wait. All data,
accounts, grants and keys belong only to the disposable fixture. Existing
database configuration is excluded; identity/freshness checks precede DDL.
Only sanitized results are retained, never database files or authentication
material. Failure or unverified cleanup cannot count as acceptance.

The hosted job pins Ubuntu 24.04, Python 3.12.14 and PostgreSQL major 16, recording
the actual server version. GitHub's current
[Ubuntu 24.04 runner inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
lists PostgreSQL 16 and cached Python 3.12.14. The job uses those existing tools
without starting system database services. It installs the existing locked
Python requirements and preserves the separate security gates.

## Protected raw-token proof

Exact integer parameters cannot be reconstructed from an already-rounded
JavaScript Number. The pinned native parser exposes raw text only through a
static `includeUnparsed` option. A supported, reviewed integration must preserve
all unrelated route behavior, the required native middleware, size and prototype
protections, and secret-handling boundaries.

The naive global raw option plus cleanup is insufficient: native empty text
bodies change from an empty string to an object. A separate local diagnostic
tested explicit baseline restoration, removal of raw metadata before other
handlers, and retention only for prospective generic processing. Its final
native comparison passed 394 requests across 197 matching pairs, including all
32 frozen parser vectors, native authentication, CMS editing/publication,
uploads, limits and malformed bodies. Fixture shutdown/removal and unchanged
source/dependency hashes were verified. The initial 330-request checkpoint is
retained separately. Generic POST is still absent: decoded requests reach a
405 routing response because the existing GET route shares its path.

That finite comparison normalizes declared ephemeral identities and response
values; it is not universal byte parity or a business DTO/storage proof. The
diagnostic and its evidence are separate from this legacy-reference source
checkpoint. Application configuration has not adopted the candidate. No vendor
patch, middleware bypass or generic business route follows from a test harness
passing. The actual locked legacy application/ORM run remains pending hosted
execution at this source checkpoint.

Both proof gates must pass before generic schema/endpoint implementation begins.
Native Strapi product-key uniqueness, FK lifecycle, startup/restart retention,
fresh-store refusal and unchanged catalog/idempotency/read/print behavior remain
mandatory later implementation acceptance checks. Existing dependency-security
failures, audit IP/source limitations and timestamp precision differences remain
explicit; this checkpoint does not approve a production cutover.

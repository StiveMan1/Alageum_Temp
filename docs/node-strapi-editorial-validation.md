# Reimplemented Page validation

The unpublished Page worktree was lost on 2026-10-02. This source was reimplemented
from visible requirements and published Vite base c4fc67e. It is not an exact
restoration of 1e6c7e0. The results below are fresh execution of this source;
earlier workspace results are not counted.

## Fresh local checks

- Backend syntax and 35 unit tests pass
- Expanded Page suite: 12 reported native HTTP/PostgreSQL tests pass, covering
  11 grouped scenarios plus the enclosing test
- Existing catalog/auth/RFQ/native CMS PostgreSQL suite: 45/45 pass, including
  preservation of all 238 catalog identities
- Frontend full lint and 150 units pass, including 18 Page-focused checks
- Normal production Next build passes with API catalog mode; the editorial
  route remains dynamic and no live Page paths are prerendered
- Explicit static-preview build passes, exporting only `/pages/ru/about` for
  editorial content across 278 exported HTML files, excluding b2b, ai, login,
  admin and api directories
- Source/manifest parity preserves all 30 baseline page URL patterns and robots:
  36 files moved under `(site)`, exactly four shared CSS import adjustments, and
  byte-identical root layout/error/not-found/robots/shared CSS
- Production HTTP fault matrix: 58/58 checks pass with browser and bot user
  agents, hard 404/500 on absent/error/invalid/timeout responses, no fallback,
  and 15 existing catalog/admin/navigation paths with the shared shell. The
  initial 38-case run passed before the navigation matrix was expanded
- Real native CMS/PostgreSQL → production Next harness: 12 grouped HTTP checks
  pass, including draft privacy, publication, republish, unpublish, exact locale,
  changed slugs, native role denial, reseeding refusal and actual backend shutdown
  returning hard 500 without stale content. Its browser mode was explicitly not run

The Page suite proves an actual failed Strapi startup preserves legacy rows and
columns and invokes no schema sync. Native writes preserve separate editor and
publisher permissions and audit identity. A deliberately failed audit insertion
rolls back both update and publication. The complete session chain rejects an
old rotated-parent bearer after the current child is revoked. Blocked users and
role/permission/session/account changes after native controller authorization
cannot write or publish. Narrowed field grants cannot commit partially sanitized
input, and refreshed native ownership conditions deny a stale publish grant while
allowing the creator to edit its own draft. Denials preserve all stored Page rows,
public content and every stored Page audit event.

Race tests wrap the real native document-manager operation only after controller
permission checks and input sanitization. Independent database connections commit
revocations before the Page transaction loads authority. Production code has no
test hook. Initial valid native sessions are reused except for deliberately
rotated/revoked sessions; the native login rate limiter is unchanged. Per-request
public error IDs are validated as UUIDv4 and matched against X-Request-ID, then
only that volatile response field is omitted from content snapshots.

## Hosted acceptance still required

Five Page browser cases are authored: native editor/publisher lifecycle, denied
native role, desktop rendering, mobile rendering and hard 404 requests. Native
browser execution and PNG/visual acceptance are not claimed locally. Local
Chromium was previously blocked by the executor; no alternate route around that
restriction was attempted.

Separate `page-contracts` and `page-delivery` jobs use independent fresh
PostgreSQL services and exact Page database names. Existing 36 catalog/RFQ browser
cases remain selected by their unchanged dedicated configs. The RFQ capture step
now waits for its exact detail URL, unique heading, fonts and visible footer.
The Page job retains successful PNG files and sanitized JSON/logs; native auth
traces are disabled to avoid persisting login/session secrets. Every failure
fails its job. New hosted jobs and screenshots must pass before functional
acceptance. The dependency audit and production environment guard remain release
blocks; no merge, deployment or production provisioning is authorized here.

## Repeatable commands

Backend: `npm run check`, then
`PG_BIN=/path/to/postgresql/bin bash scripts/run-page-tests.sh`. The runner ignores
the caller's database URL and creates a disposable loopback cluster. Existing
regressions use `bash scripts/run-local-tests.sh --integration-only`. Use a
workspace-backed TMPDIR to avoid RAM-disk pressure.

Frontend: `npm run lint`, `npm run test:unit`, `npm run build`,
`node scripts/verify-editorial-http.mjs`, and `npm run build:preview`.
The fault matrix starts only its own fixture API and production Next server;
it does not establish native CMS or browser acceptance.

With the frontend build available, `bash scripts/run-page-tests.sh
--delivery-http` creates a fresh Page database and exercises the actual native
HTTP→Next path. It explicitly reports browser not run and is forbidden when CI
is set. Hosted delivery runs `node backend-node/scripts/run-page-delivery.js`
without that flag, after both CMS and Next builds, and requires all five browser
cases plus their screenshots. Every runner stops its own children and retains
bounded evidence under ignored `page-delivery-evidence/` or its disposable test
folder. No credentials are committed.

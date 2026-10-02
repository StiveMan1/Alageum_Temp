# Native catalog specification editor validation

## Hosted functional acceptance and pending visual evidence

PR9 hosted acceptance is green at exact commit
`a40d3242d7fe3a64df3195a489c9b90a93bf87ea` (tree
`d46b6526be5a9c5d3314021569d56f728652d37a`): **55 backend units, 52 PostgreSQL
integrations, 150 frontend units, all 43 default browser cases and all four
optional-webpack CMS browser cases passed without retries**. The dependency
audit reports **0 high and 15 moderate** findings. This supersedes the pending
hosted status of the earlier local feature checkpoints described below.

The retained `native-cms-guarded-editor.png` shows the bottom of the editor;
it does not establish visual acceptance of the typed specification controls.
The current screenshot-only checkpoint adds five captures after the relevant
saved/reloaded or public assertions, using a 1440 × 1800 desktop viewport,
cleared focus, deliberate target-centered scrolling and a full-visibility
assertion before each PNG:

- `native-cms-literal-source-page.png`
- `native-cms-numeric-null-unit.png`
- `native-cms-multiline-configuration.png`
- `public-detail-specifications.png`
- `public-comparison-specifications.png`

They use the existing CMS test output directory under
`frontend/playwright-report/cms-results/`, with native test attachments. Existing
workflow artifact paths already retain these PNGs; privacy allowlists, workflow,
application behavior and dependencies are unchanged. Current functional
assertions are retained. **This new screenshot checkpoint awaits a hosted run
and pixel inspection; the green a40d3242 run does not verify the new captures.**
The screenshot checkpoint passes frontend lint, JavaScript syntax and whitespace
checks, and discovery still selects all five native CMS cases with zero retries.

## Earlier local combined verification

Validation date: 2026-10-02. The feature was rebased without conflicts onto the
verified PR8 commit `7866ef10815059dc79a7015009d99fdd49706d5d` (tree
`9e3407a8ff65672b02e9ffc13ab9ff2c2c001b27`). Combined acceptance below ran against
feature code commit `f8a6e05934ede6901e578c1f292938ab06717d1f` (tree
`4bbc6998871db88603c16a8354f0a15b4adedb58`). A subsequent wording-only correction
keeps “Choose Text” guidance on typed row values, directs Power source text to a
text specification row, and requests a positive safe integer for Source page.
Validation/type behavior is unchanged. Its affected draft suite passed **8/8**,
and module syntax/whitespace checks passed; the broader combined checks below
were not repeated for that error-message correction.

This bounded native CMS authoring change preserves PR8's compatibility files,
dependency locks, guards and workflow. It adds no database migration, public
identity, dependency or v1 transport change. The earlier PR7-based checkpoint
passed 42 backend units and 52 integrations; those results are superseded by the
combined verification below.

## Completed locally

- Backend syntax and unit checks: **54 passed, 0 skipped**. Seven new draft
  cases include exact roundtrips for all 238 reviewed source specification
  objects, typed numeric edits, literal strings, absent/null/empty unit states,
  source metadata, lossless decimal conversion, negative zero rejection,
  explicit booleans, LF-containing literal text and validation-path mapping.
  The 12 existing PR8 patch-guard cases remain included.
- Real Strapi/PostgreSQL integration: **52 passed, 0 skipped**. Seven new native
  HTTP cases exercise typed JSONB/HTTP replacement, 15 invalid field paths,
  category absence/publication, native management versus tenant permissions,
  concurrent version conflicts, before/after CMS audit identity, atomic rollback
  after audit insertion, public detail/comparison, and immutable stored RFQ
  snapshots after subsequent specification edits. Existing transaction/session
  revocation and production-refusal checks also pass.
- Production Strapi administration build and built-asset checks: **passed** after
  the final UI changes.
- All four production frontend builds: **passed** (API catalog, isolated
  interruption build, live Page delivery, and static preview).
- Page contracts: **12 passed**. Page HTTP fault matrix: **58 passed**. Native
  Page HTTP delivery: **12 passed**. Servers started and stopped successfully.
- Frontend lint: **passed**. Frontend unit suite: **150 passed, 0 skipped**.
- All **43 default browser cases were discovered**, including the expanded five
  native CMS cases. They remain selected by the existing hosted workflow, with
  no added login, retries, timeout relaxation, skipped cases or weakened assertions.
  Discovery is not execution.
- Fresh unchanged dependency audit gate: **0 high/critical, 15 moderate**, exit 0.
- Webpack middleware protocol: **42 passed**. Exact-config compiled equivalence:
  **passed in the DOM-free VM only**, including 3,024 glob comparisons and 112
  upload-filter decisions. No browser-equivalence pass is claimed.
- Actual optional-webpack cold/warm Strapi compilation, CMS HTTP/assets,
  API isolation, SSE build updates, intentional syntax-error recovery and source
  restoration: **passed**. Both server ports were released and the disposable
  PostgreSQL cluster stopped. Its four browser cases were not executed.
- Git whitespace check: **passed**. Dependency manifests/locks, reviewed catalog
  data and public identifiers are unchanged from the base.

Local tests used a task-owned PostgreSQL 17 cluster on loopback TCP and separate
named disposable test databases. A fresh physical `npm ci` installed the exact
PR8 lock in this worktree;
postinstall applied both expected adapter patches and the guard verified them.
The pre-existing physical frontend install matches its unchanged lock.
Temporary/cache paths were workspace-backed; HOME and CODEX_HOME were
unchanged. Disposable application keys were process-only. The database server
was stopped after verification. The unchanged combined acceptance runner was
invoked with explicit `--http-builds`; its protected-file and cleanup checks
passed. Its generated compatibility report was retained in the feature-specific
[combined report](../backend-node/docs/spec-editor-combined-results.json), with
supplemental audit/protocol/webpack checks. The original PR8 compatibility
report was restored byte-for-byte.

## Browser coverage and local execution limit

The cloud executor's previously verified Unix-socket restriction blocks local
Chromium. No browser was launched or alternate route attempted for this slice.
Browser test discovery is not browser execution. Hosted a40d3242 acceptance above
establishes the functional browser pass; the new screenshot captures remain
unrun locally and await their own hosted evidence.

The existing native flows now additionally check:

1. Typed row/unit/page and multiline configuration authoring, unsafe-number
   field errors
   with zero network writes, exact published specs, and Next detail/comparison
   visibility. Hide/Restore preserves saved specs and is disabled while unsaved
   specification edits exist. The LF-containing literal is checked before save,
   in exact API JSON and after native reload, along with its unchanged unit/page.
2. Two-session spec conflicts retain the losing draft, keep status actions
   disabled while dirty, then reload the winning spec and re-enable them.
3. A denied native administrator cannot overwrite specs.
4. Native refresh retains unsaved specs.
5. A 401 mutation is not retried, preserves unsaved specs, and retains the
   existing late-response Close/Back/Forward assertions.

The existing workflow runs these cases with its actual built Strapi CMS and
production Next app. All 43 default cases, four optional webpack CMS cases and
the real-browser compiled equivalence probe remain unrun locally for this
feature. Hosted results are distinguished above. The broader Page
HTTP/contracts/builds did run locally as recorded. The moderate advisories and
production startup refusal remain; this report makes no production-readiness
claim.

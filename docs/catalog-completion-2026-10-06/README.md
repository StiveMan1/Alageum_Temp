# Catalog completeness review · 6 October 2026

The current catalog accounts for **843 official records**: 687 explicit source entries, 142 family overviews and 14 legacy website references. All 238 legacy records and all 585 originally admitted transformer records retain their source bodies and IDs. Twenty explicitly named executions are appended. The nine existing demo examples are outside these official-source totals.

## Identity and source representation

All 540 entries in the new PDF are represented by 528 independent entries and 12 source-specific panels. There are also 77 new family overviews. Of the 32 previously held overlaps:

- 20 are explicit TMG or TSL executions admitted under their own stable IDs
- 2 NTMI source IDs are read-only aliases to the existing canonical references, with separate source evidence
- 10 conflicting descriptions appear beside the existing reference, with each source's values kept separate

No source comparison creates a duplicate product card or establishes interchangeability. The printed 58 held configurations remain 40 configurations on the admitted entries and 18 within source panels. No combination expansion, order-ready SKU, price or availability is invented. The NTMI unit discrepancies remain visible; unknown PDF dimension units do not erase the website's explicit millimetres.

Aliases do not change database UUID derivation, saved selections, quote references or snapshots. API alias navigation requires the original canonical UUID and cannot fall back to a reused slug. The insert-only importer preserves edited or hidden existing records; hosted PostgreSQL tests exercise 823→843 and repeated imports.

## Card presentation and reusable illustrations

Every official record now has a visible description based on its existing source facts. Source labels and raw values remain intact. There are 102 family selectors with no default child: 26 legacy families and 76 transformer families. A generic reactor overview presents its 15 printed configuration rows separately, without creating fictitious product combinations. Source tables, dimensions and uncertainties remain accessible on the cards.

Five source-family overviews also link directly to ten source-specific panels on the existing canonical cards. These links remain outside member selection and summary aggregation, require both family and target guards, and respect the currently visible API records. NTMI keeps its existing instrument-transformer cards and read-only aliases.

The exact per-record ledger is [coverage.json](./coverage.json). Counts come from the same guarded selectors used by the site:

| Coverage | All 843 records | 687 explicit source entries |
| --- | ---: | ---: |
| Source-grounded default 3D | 448 | 392 |
| Records with explicit construction choices | 36 | 36 |
| Number of construction choices | 74 | 74 |
| Generic default illustrations | 14 | 0 |
| No default or selectable 3D | 345 | 259 |
| Source-based default icons | 455 | 398 |
| Typical default icons | 65 | 43 |
| Source-document fallback | 323 | 246 |

Family overviews are not physical products requiring invented geometry. The 345 records without a direct or selectable model include 86 family overviews and 259 explicit entries. Fourteen legacy references retain clearly labelled generic illustrations. All 3D is illustrative; none is CAD or a dimensional manufacturing model.

This completion adds 25 transformer default model/icon bindings and eight choices for four additional TSL rows. Thirteen copper TMG bindings rely on the coherent copper subsection on physical pages 40–43, bounded by the next execution on page 44. This is a reviewed subsection inference, not an explicit copper figure caption. Optional rollers, fuse and instrumentation details do not become order specifications. The separate [asset review](../catalog-transformers-2026/review/asset-completion/README.md) pins source pages, record shapes, API UUIDs and exact helper dependencies.

One old ШР11 entry now reuses the existing open-panel model and icon after the manufacturer's dedicated page corroborated the source drawing. [Independent review](./shr11-independent-review.json) limits that mapping to `cat-pr-shr11-v002`; ПР and ПР-11 remain excluded. All other 237 legacy visual/icon mappings stay unchanged.

No raster or geometry mesh was added. The package remains 248 raster assets, 21,968,700 bytes, including all 187 optimized pages of the new PDF. Missing high-voltage and execution-specific construction evidence is preserved as a gap; category-level models are not substituted. [Remaining source gaps](./remaining-source-gaps.json) group the 259 explicit entries into 33 source families: 43 legacy entries and 216 new-catalog entries.

## Verification and release status

This is a draft catalog change, not a deployment or production-readiness claim. Local validation passed 437 frontend tests, ESLint, the 894-page production build, and 577 backend aggregate tests. The final hosted catalog suite contains 94 desktop/mobile cases, including source-reference click/back/forward flows and retained success screenshots. Exact-head hosted results must be read alongside the PR checks.

The published `43bea601` preflight passed all 104 PostgreSQL cases, including 823→843 migration, repeat import, preservation of edited/hidden records and NTMI UUID/snapshot replay. Native Page fast-save and input-lifecycle protection also passed. Its remaining stale category-count assertion and shared configuration-renderer regression are corrected in this follow-up: designation and literal multiline value keep separate text nodes, while units and source pages remain separate. Existing native CMS assertions are retained.

Security audits remain enforced and failed on that preflight: frontend 6 high; Node 29 high and 3 moderate. No dependency, release gate, deploy workflow or CMS editor implementation is changed by this completion.

Reproduce the source and asset checks from the repository root:

    node scripts/complete-catalog-identities.mjs --check
    node scripts/import-transformers-2026.mjs --activate --clearance docs/catalog-transformers-2026/review/data-clearance.json --check
    node scripts/approve-transformer-assets.mjs docs/catalog-transformers-2026/review/assets-clearance.json --check
    node scripts/approve-transformer-execution-choices.mjs docs/catalog-transformers-2026/review/execution-choice-clearance.json --check
    node scripts/approve-transformer-asset-completion.mjs docs/catalog-transformers-2026/review/asset-completion/clearance.json --check
    node scripts/generate-catalog-media.mjs --check
    node scripts/audit-catalog-completion.mjs --check
    npm --prefix frontend run check
    npm --prefix backend-node run check

The original [phase-one summary](./phase1-summary.json), [phase-two summary](./phase2-summary.json), and isolated identity/asset manifests are retained as historical checkpoints. The current coverage ledger and the final PR head are authoritative for combined counts and bindings.

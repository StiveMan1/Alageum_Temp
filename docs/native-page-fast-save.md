# Native Page fast-save investigation

The original bounded diagnostic checkpoint on top of frozen PR23 changed test
fixtures and verification only. The diagnostic remains intact. The current
candidate adds the scoped input adapter described below; it does not rewrite
Strapi vendor code, change dependency versions, or grant roles in an existing
database.

## Observed failure and scoped input adapter

PR29 head `6594535257fd044a865f8f218419cac77d1b9805` reproduced a mismatch in
[the retained browser artifact](https://github.com/StiveMan1/Alageum_Temp/actions/runs/37300508866/artifacts/11340787609).
Attempt 2 typed Blocks before the title and clicked Publish 59.9ms after the
last body input event. The outgoing request omitted `body`; native response and
reload returned null, and the public API/page were empty. Title and slug survived.
The same attempt included a real body blur before Publish, so adding a blur alone
does not establish a fix.

In pinned Strapi 5.56, the editor debounces form synchronization for 300ms. Its
blur flush can be skipped by Slate while updating selection. Native reset-key
bookkeeping also distinguishes editor changes from form-value changes, so an
intervening field render while the body remains unset can reset the editor.
The browser evidence establishes loss before submission; these source paths
explain why a Publish-only delay or an extra draft save is inadequate.

`src/admin/app.js` registers an application field wrapper. Only `api::page.page`
and its `body` field use the native input's existing `livePreviewSync` mode.
That mode updates form state on each AST change without creating the delayed
callback. Other fields keep their supplied mode and all native props, including
disabled state. Native rendering, rich-text structure, empty normalization,
Save/Publish actions, validation, authorization and endpoints are retained.
This trades debounced form updates for synchronous updates on Page body edits.

The native `BlocksInput` module is not a public package export. This is a pinned
internal compatibility adapter, not a claim of a stable public input API. Its
16 compiled editor/action files and source maps were compared byte-for-byte with
the official `@strapi/content-manager@5.56.0` npm tarball, whose integrity matches
the lockfile. `check-page-editor-adapter.js` verifies those hashes, package version
and lock integrity before checks, development, build and start. A changed package
must fail for explicit adapter review; the check never patches vendor files.

Five deterministic callback tests load the unchanged installed BlocksEditor
module with real React server rendering and Slate. They prove immediate repeated
edits, preserved structured content, clear-to-null, selection-only no-ops, and no
pending timer in synchronous mode. The old mode demonstrably retains a pre-reset
callback. Visual child modules and timer scheduling are controlled in that test;
it is not a browser, React-effect or full discard/unmount proof. Four additional
checks cover vendor/version drift, missing files and redirected paths.

The existing seven native Page cases and twelve-attempt fast-save diagnostic
remain mandatory. Additional bounded browser coverage exercises keyboard Save
and Publish, repeated revisions, clearing, cancel/leave and native discard. Any
post-cancel observation across the old debounce window is labeled separately;
there is no sleep before a save/publish action to make it pass.

The current local candidate passes 573 backend checks, 377 frontend checks,
frontend lint and the CMS build. The official npm registry still reports 5.56.0
as latest on 2026-10-05. Local Chromium still
fails before page creation with a socket-permission error, so the candidate's
actual browser lifecycle behavior requires hosted verification. No new browser
pass or production-readiness claim is implied by the local results.

The new keyboard cases focus the title field immediately after body input and
record that target explicitly. Native Blocks handles modified Enter before the
global document shortcuts, so exact-body shortcut behavior while Blocks itself
remains focused is not covered by this adapter's verification. Reset-dialog
timing is measured separately; a slower dialog is not claimed as a sub-300ms
reset. Existing hard dependency audit gates remain unchanged.

The first hosted adapter run passed all seven existing Page cases and all twelve
original fast-save attempts, each measured inside 300ms. The new keyboard create,
publish and revision scenarios passed at 25–41ms. Its select-all/backspace clear
sequence submitted a one-character deletion, which the server preserved exactly;
it did not establish a lost empty-body update. The clear fixture now uses the
explicit contenteditable `fill('')` operation and still requires native null and
public empty content. Native selection behavior for rapid Ctrl+A/Backspace is
not claimed by that fixture. Leave/discard confirmations are selected by their
actual native `alertdialog` role.

## Reason for the probe

An earlier PR23 browser run received a successful first-create response with the
correct synthetic Page slug and title but a null Blocks body. That run did not
retain the outgoing request body, so it cannot establish where the value was
lost. The native HTTP publication checks passed. Three subsequent source heads
passed the seven Page browser cases, including a strict outgoing-payload check.
Those results do not establish that every fast interaction is reliable.

Installed Strapi 5.56.0 already contains the related upstream fixes in
[#26020](https://github.com/strapi/strapi/pull/26020) and
[#27042](https://github.com/strapi/strapi/pull/27042). The official registry and
release check on 2026-10-03 found no newer stable release or demonstrated narrow
fix. This checkpoint does not attribute the earlier failure to a vendor defect.
The installed BlocksEditor, BlocksContent and DocumentActions compiled files
and source maps were also compared with the official npm tarball: all 12 files
matched, and tarball integrity matched both the lockfile and registry metadata.
The three embedded TypeScript sources matched the official release tag.

## Bounded matrix

One serial Chromium test plans 12 measured attempts:

- Create with body entered before title, following the earlier entry order
- Create with title entered before body
- Edit the body of an existing, verified native draft

Each scenario uses both default-speed sequential key input and Playwright's
contenteditable `fill`, followed by immediate Save or dirty-form Publish.
`fill` is a browser input method, not proof of a physical clipboard paste. Setup
saves for the existing-draft cases are distinguished from measured attempts.
Reload and public API/page checks verify the exact saved body and publication
state after each attempt.

The test has no retries, artificial delays, timer overrides, mocked writes or
automatic resaves. It stops at the first mismatch. Its browser budget is 180
seconds. The parent starts stopping the child at 195 seconds and permits up to
five seconds for termination before a forced stop. The existing outer Page
delivery deadline remains 780 seconds, with an 800-second CI process limit.
The existing seven Page browser cases and native
publication checks run first and keep their original assertions.

## Fixture and evidence boundaries

The extra actor exists only when both `--fast-save-probe` and
`ALAGEUM_TEST_PAGE_FAST_SAVE=1` are explicit. The harness still requires test mode
and a fresh loopback database named exactly `alageum_strapi_pages_test` before
Strapi loads. The additional native role grants only Page read, create, update
and publish. The existing separate editor, publisher and denied actors retain
their original permissions. No existing database or user is provisioned.

Native authentication traces and video are disabled. Evidence contains selected
synthetic Page fields, mutation method/status, passive input/blur/action timing,
and explicit screenshots. It excludes cookies, authorization headers, passwords,
tokens, browser storage and unrelated network payloads. Child output passes
through the existing complete-line secret redactor.

The timing report distinguishes attempts whose final native Blocks
`beforeinput`/`input` event reached the save/publish action within 300ms. This
measures browser input intent, not the time React commits a form value. The
event type and separate native input timestamp are retained because Slate can
handle input while preventing the default DOM input event. A clean run only
establishes the measured attempts; it is not proof that every scheduling race is
absent. A mismatch in the submitted body points to the client/form path. An exact
submitted body followed by a mismatched saved or reloaded body points to a later
stage. After a mismatch the same attempt may finish read-only reload/public
checks for diagnosis; no later attempt or repeated write runs. Either outcome
requires inspection before choosing a corrective change.

## Original diagnostic verification

The local checkpoint passed 549 backend checks, including 11 new fixture and
evidence-gate tests, plus seven real PostgreSQL/native HTTP fixture checks.
Frontend lint passed. Discovery retained the existing 58 general and seven Page
cases, with exactly one new diagnostic under its separate configuration.
Independent source review found no remaining blocking issue in the diagnostic.

Hosted execution is required to establish the 12 actual outcomes and measured
timing coverage. Its exact source head, run and artifacts are recorded in the
draft PR. Local validation does not claim a reproduced or fixed race. The
existing hard dependency-security gates remain enabled and blocked; a functional
probe cannot approve deployment.

# Native Page fast-save investigation

This is a bounded diagnostic checkpoint on top of frozen PR23. It changes test
fixtures and verification only. It does not change the Page editor, Strapi vendor
code, dependencies, roles in an existing database, or production configuration.

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

## Verification status

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

"use strict";

const assert = require("node:assert/strict");
const PREFIX = "PAGE_SYNC_REGRESSION_EVIDENCE=";
const SCENARIOS = [
  "keyboard-save-create", "keyboard-publish-rapid-edits", "keyboard-save-rapid-revision",
  "keyboard-publish-clear", "cancel-leave-retains-input", "confirm-leave-unmounts-input",
  "discard-cancel-and-reset",
];

function browserCases(report) {
  const cases = [];
  function visit(suites) {
    for (const suite of suites || []) {
      for (const spec of suite.specs || []) cases.push(...(spec.tests || []));
      visit(suite.suites);
    }
  }
  visit(report.suites);
  return cases;
}

function extractPageSyncEvidence(report) {
  const entries = [];
  for (const test of browserCases(report)) for (const result of test.results || []) {
    const stdout = (result.stdout || []).map(item => item.text || "").join("");
    for (const line of stdout.split(/\r?\n/)) if (line.startsWith(PREFIX)) entries.push(line.slice(PREFIX.length));
  }
  assert.equal(entries.length, 1, "Page synchronization browser must emit one curated evidence record");
  return JSON.parse(entries[0]);
}

function assertPageSyncAcceptance(report, evidence) {
  assert.equal(report.stats?.expected, 1);
  for (const key of ["unexpected", "skipped", "flaky"]) assert.equal(report.stats?.[key], 0);
  const cases = browserCases(report);
  assert.equal(cases.length, 1);
  assert.equal(cases[0].expectedStatus, "passed");
  assert.equal(cases[0].results?.length, 1, "No automatic browser retry may hide a synchronization failure");
  assert.equal(cases[0].results[0].status, "passed");
  assert.equal(cases[0].results[0].retry, 0);
  assert.equal(evidence.schemaVersion, 1);
  assert.deepEqual(evidence.totals, { planned: 7, attempted: 7, passed: 7, failed: 0 });
  assert.deepEqual(evidence.scenarios?.map(item => item.id), SCENARIOS, "All seven lifecycle scenarios must run in order");
  for (const scenario of evidence.scenarios) {
    assert.equal(scenario.outcome, "passed");
    assert.deepEqual(scenario.mismatches, []);
  }
  assert.equal(evidence.writes?.length, 6, "Only the six explicit native fixture writes are allowed");
  assert.deepEqual(evidence.scenarios.map(item => item.writeCount), [1, 1, 1, 1, 0, 0, 2]);
  assert.deepEqual(evidence.writes.map(item => [item.method, item.action, item.status]), [
    ["POST", "save", 201], ["POST", "publish", 200], ["PUT", "save", 200],
    ["POST", "publish", 200], ["PUT", "save", 200], ["POST", "discard", 200],
  ]);
}

module.exports = { SCENARIOS, extractPageSyncEvidence, assertPageSyncAcceptance };

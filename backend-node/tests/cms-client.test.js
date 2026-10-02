"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const guards = () => import("../src/plugins/alageum-catalog/admin/src/client-guards.mjs");

test("CMS error messages read pinned Strapi FetchError.status and keep validation useful", async () => {
  const { errorMessage } = await guards();
  for (const status of [401, 403]) {
    assert.match(errorMessage({ status, response: { data: { error: { message: "Forbidden" } } } }), /does not have access/);
  }
  assert.match(errorMessage({ status: 409, response: { data: { error: { code: "catalog_version_conflict" } } } }), /Reload the product/);
  assert.equal(errorMessage({ status: 409, response: { data: { error: { code: "catalog_unique_conflict", message: "SKU already in use" } } } }), "SKU already in use");
  assert.equal(errorMessage({ status: 422, response: { data: { error: { details: [{ loc: ["translations", "ru", "name"], msg: "Too long" }] } } } }), "translations.ru.name: Too long");
});

test("CMS mutation accepts 401 only to reject outside native automatic retry, with captured identity", async () => {
  const { mutationOptions, acceptMutationResponse } = await guards();
  const options = mutationOptions("original-session-token");
  assert.equal(options.headers.Authorization, "Bearer original-session-token");
  assert.equal(options.validateStatus(401), true);
  for (const status of [403, 409, 422, 500]) assert.equal(options.validateStatus(status), false);
  assert.throws(() => acceptMutationResponse({ data: { error: { code: "authentication_required", message: "Expired" } } }), { status: 401, message: "Expired" });
  const response = { data: { id: "saved-product", version: 2 } };
  assert.equal(acceptMutationResponse(response), response);
});

test("CMS editor keys preserve drafts across native rotation and reset on account change", async () => {
  const { accountKey } = await guards();
  const token = (payload) => `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
  assert.equal(accountKey(token({ userId: "1", sessionId: "session-a" })), "1");
  assert.notEqual(accountKey(token({ userId: "1", sessionId: "session-a" })), accountKey(token({ userId: "2", sessionId: "session-a" })));
  assert.equal(accountKey(token({ userId: "1", sessionId: "session-a" })), accountKey(token({ userId: "1", sessionId: "session-b" })));
  for (const malformed of ["", "no-token", token({ sessionId: "session-a" })]) assert.equal(accountKey(malformed), null);
});

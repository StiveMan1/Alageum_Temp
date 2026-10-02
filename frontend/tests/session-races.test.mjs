import assert from 'node:assert/strict';
import test from 'node:test';
import { apiFetch, getSession, setSession } from '../lib/api/client.js';
import { createQuote } from '../lib/api/quotes.js';
const accountA = { access_token: 'access-a', refresh_token: 'refresh-a', organization_id: 'org-a' };
const accountB = { access_token: 'access-b', refresh_token: 'refresh-b', organization_id: 'org-b' };
const response = (status, body = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function browser(fetcher) {
  const oldWindow = globalThis.window, oldFetch = globalThis.fetch, data = new Map(), events = [];
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  const oldStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  globalThis.fetch = fetcher;
  return { events, restore() { globalThis.window = oldWindow; globalThis.fetch = oldFetch; globalThis.sessionStorage = oldStorage; } };
}
test('catalogue POST never auto-retries or refreshes after 401, preserving a newer account', async () => {
  const pending = deferred(), calls = [], env = browser(async (url, options) => { calls.push({ url, options }); return pending.promise; });
  try {
    setSession(accountA);
    const post = createQuote({ comment: 'private-a', items: [] }, 'request-a');
    setSession(accountB); pending.resolve(response(401));
    await assert.rejects(post, { status: 401 });
    assert.equal(calls.length, 1); assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer access-a');
    assert.deepEqual(getSession(), accountB); assert.deepEqual(env.events, []);
  } finally { env.restore(); }
});
test('same-session catalogue 401 prompts explicit reauthentication without automatic retry', async () => {
  let calls = 0; const env = browser(async () => { calls++; return response(401); });
  try {
    setSession(accountA);
    await assert.rejects(createQuote({ items: [] }, 'request-a'), { status: 401 });
    assert.equal(calls, 1); assert.deepEqual(getSession(), {}); assert.deepEqual(env.events, ['alageum:session-expired']);
  } finally { env.restore(); }
});
test('pending account-A refresh cannot overwrite account B or replay A request as B', async () => {
  const refresh = deferred(), refreshStarted = deferred(), calls = [];
  const env = browser(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/refresh')) { refreshStarted.resolve(); return refresh.promise; }
    return response(401);
  });
  try {
    setSession(accountA); const read = apiFetch('/quotes?mine=true'); await refreshStarted.promise;
    setSession(accountB); refresh.resolve(response(200, { access_token: 'rotated-a', refresh_token: 'rotated-refresh-a' }));
    await assert.rejects(read, { code: 'session_changed' });
    assert.deepEqual(getSession(), accountB); assert.deepEqual(env.events, []); assert.equal(calls.length, 2);
  } finally { env.restore(); }
});
test('late failed A refresh cannot sign out B; separate B refresh never awaits A flight', async () => {
  const aRefresh = deferred(), bRefresh = deferred(), aStarted = deferred(), bStarted = deferred(), calls = [];
  const env = browser(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/refresh')) {
      if (JSON.parse(options.body).refresh_token === 'refresh-a') { aStarted.resolve(); return aRefresh.promise; }
      bStarted.resolve(); return bRefresh.promise;
    }
    return options.headers.get('Authorization') === 'Bearer rotated-b' ? response(200, { owner: 'b' }) : response(401);
  });
  try {
    setSession(accountA); const aRead = apiFetch('/quotes?mine=true'); await aStarted.promise;
    setSession(accountB); const bRead = apiFetch('/quotes?mine=true'); await bStarted.promise;
    aRefresh.resolve(response(401)); await assert.rejects(aRead, { code: 'session_changed' });
    assert.deepEqual(getSession(), accountB); assert.deepEqual(env.events, []);
    bRefresh.resolve(response(200, { access_token: 'rotated-b', refresh_token: 'rotated-refresh-b' }));
    assert.deepEqual(await bRead, { owner: 'b' });
    assert.equal(getSession().access_token, 'rotated-b'); assert.equal(getSession().organization_id, 'org-b');
    assert.equal(calls.filter(call => call.url.endsWith('/auth/refresh')).length, 2);
  } finally { env.restore(); }
});

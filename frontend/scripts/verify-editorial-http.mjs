// Reimplemented acceptance: fixture-only HTTP faults, never native CMS proof.
// Run after the normal production Next build. No development server is used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createSocketServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { getPreviewPage } from '../lib/public/pagesPreview.js';
import { validateEditorialPage } from '../lib/public/pages.js';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(frontend, '../page-delivery-evidence');
await mkdir(evidence, { recursive: true });
const report = { implementation: 'reimplemented', kind: 'fixture-only-production-next-http', nativeCms: false, startedAt: new Date().toISOString(), cases: [], status: 'running' };
const fixture = validateEditorialPage(getPreviewPage('ru', 'about'), { locale: 'ru', slug: 'about' });
const firstText = fixture.body[0].children[0].text;
const privateText = 'PRIVATE_FAULT_MATRIX_DRAFT_8b930f';
const secondText = 'REPUBLISHED_FAULT_MATRIX_BODY_8b930f';
const htmlText = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
let mode = 'missing', published = null, reads = 0, web, protocolFailure;
const timers = new Set();
const fake = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (!url.pathname.startsWith('/api/v1/pages/')) { response.writeHead(404).end(); return; }
  reads += 1;
  if (request.headers.authorization || request.headers.cookie) {
    protocolFailure = 'Public Page reads must not forward authorization or cookies';
    response.writeHead(500).end(); return;
  }
  const send = () => {
    if (response.destroyed) return;
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname !== '/api/v1/pages/about' || url.searchParams.get('locale') !== 'ru' || ['missing', 'delayed-missing'].includes(mode) || (!published && mode === 'normal')) {
      response.writeHead(404).end(JSON.stringify({ error: { code: 'page_not_found' } })); return;
    }
    if (['api-500', 'delayed-500'].includes(mode)) { response.writeHead(500).end(JSON.stringify({ error: 'disposable fault' })); return; }
    if (mode === 'malformed-json') { response.writeHead(200).end('{not JSON'); return; }
    const value = structuredClone(published || fixture);
    if (mode === 'unsafe-blocks') value.body = [{ type: 'paragraph', children: [{ type: 'link', url: 'javascript:alert(1)', children: [{ type: 'text', text: privateText }] }] }];
    if (mode === 'mismatched-locale') value.locale_code = 'en';
    response.writeHead(200).end(JSON.stringify(value));
  };
  const delay = mode === 'timeout' ? 6500 : mode.startsWith('delayed-') ? 350 : 0;
  if (!delay) { send(); return; }
  const timer = setTimeout(() => { timers.delete(timer); send(); }, delay);
  timers.add(timer);
  response.on('close', () => { clearTimeout(timer); timers.delete(timer); });
});
const nextLog = createWriteStream(join(evidence, 'fault-matrix-next.log'));
const apiLog = createWriteStream(join(evidence, 'fault-matrix-api.log'));
const closed = child => new Promise(resolveClosed => child.once('close', (code, signal) => resolveClosed({ code, signal })));
async function freePort() {
  const server = createSocketServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const done = closed(child);
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
  try { await done; } finally { clearTimeout(timer); }
}
let origin;
async function check(name, path, expected, ua, { present, absent = [], sharedShell = false, minimumMs = 0, maximumReads = expected >= 500 ? 2 : 1 } = {}) {
  const before = reads, started = Date.now();
  const item = { name, userAgent: ua.name, path, expectedStatus: expected, status: 'running' };
  report.cases.push(item);
  try {
    const response = await fetch(`${origin}${path}`, { headers: { 'User-Agent': ua.value }, redirect: 'manual', signal: AbortSignal.timeout(18000) });
    const body = await response.text();
    Object.assign(item, { actualStatus: response.status, upstreamReads: reads - before, durationMs: Date.now() - started });
    assert.equal(protocolFailure, undefined);
    assert.equal(response.status, expected, `${name}: hard HTTP status (${ua.name})`);
    assert.ok(item.upstreamReads <= maximumReads, `${name}: expected at most ${maximumReads} upstream reads, saw ${item.upstreamReads}`);
    assert.ok(item.durationMs >= minimumMs, `${name}: timeout must exercise the five-second loader deadline`);
    if (present) { assert.ok(body.includes(htmlText(present)), `${name}: published body missing`); assert.equal(item.upstreamReads, 1); }
    for (const text of absent) assert.ok(!body.includes(htmlText(text)), `${name}: private, stale or fixture content leaked`);
    if (expected !== 200) for (const text of [firstText, privateText, secondText]) assert.ok(!body.includes(htmlText(text)), `${name}: failed requests must not render stale/fixture body`);
    if (sharedShell) {
      assert.match(body, /<header[^>]+class="[^"]*site-header/);
      assert.match(body, /<footer[^>]+class="[^"]*site-footer/);
    }
    assert.ok(!/href=["'][^"']*\/(?:\(site\)|%28site%29)\//i.test(body), `${name}: route group leaked into href`);
    item.status = 'passed';
  } catch (error) { item.status = 'failed'; item.error = error.message; throw error; }
  finally { apiLog.write(`${JSON.stringify(item)}\n`); }
}
const watchdog = setTimeout(() => { console.error('Fixture HTTP matrix exceeded its 180-second deadline'); process.kill(process.pid, 'SIGTERM'); }, 180000);
async function shutdown() {
  await stop(web);
  for (const timer of timers) clearTimeout(timer);
  fake.closeAllConnections();
  await new Promise(done => fake.close(done));
}
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { interrupted = true; report.status = 'failed'; report.error = `Interrupted by ${signal}`; shutdown().finally(() => { writeFile(join(evidence, 'fault-matrix-results.json'), JSON.stringify(report, null, 2)).finally(() => process.exit(1)); }); });
try {
  await new Promise((done, reject) => { fake.once('error', reject); fake.listen(0, '127.0.0.1', done); });
  const apiOrigin = `http://127.0.0.1:${fake.address().port}`;
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  web = spawn(process.execPath, [join(frontend, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: frontend, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', API_INTERNAL_BASE_URL: `${apiOrigin}/api/v1`, PAGES_SOURCE: 'api', PAGES_STATIC_PREVIEW: '0', PAGES_SITE_ORIGIN: origin },
  });
  web.stdout.pipe(nextLog, { end: false }); web.stderr.pipe(nextLog, { end: false });
  let spawnError;
  web.once('error', error => { spawnError = error; });
  const readinessDeadline = Date.now() + 45000;
  while (true) {
    if (spawnError) throw spawnError;
    assert.ok(web.exitCode === null && web.signalCode === null, 'Production Next exited before readiness');
    try { const response = await fetch(`${origin}/login`, { signal: AbortSignal.timeout(1500) }); await response.arrayBuffer(); if (response.status === 200) break; } catch { /* Bounded startup retry. */ }
    assert.ok(Date.now() < readinessDeadline, 'Production Next readiness deadline exceeded');
    await new Promise(done => setTimeout(done, 200));
  }
  for (const ua of [
    { name: 'browser', value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36' },
    { name: 'bot', value: 'Twitterbot/1.0' },
  ]) {
    published = null; mode = 'normal';
    await check('private draft', '/pages/ru/about', 404, ua);
    published = structuredClone(fixture);
    await check('publish', '/pages/ru/about', 200, ua, { present: firstText });
    // The fake draft changes; its published snapshot deliberately stays fixed.
    const draft = { ...structuredClone(fixture), body: [{ type: 'paragraph', children: [{ type: 'text', text: privateText }] }] };
    assert.notDeepEqual(draft.body, published.body);
    await check('draft edit remains private', '/pages/ru/about', 200, ua, { present: firstText, absent: [privateText] });
    published.body = [{ type: 'paragraph', children: [{ type: 'text', text: secondText }] }];
    await check('republish is fresh', '/pages/ru/about', 200, ua, { present: secondText, absent: [firstText, privateText] });
    published = null;
    await check('unpublish', '/pages/ru/about', 404, ua);
    published = structuredClone(fixture);
    for (const [name, path, expected, selectedMode] of [
      ['missing', '/pages/ru/missing-page', 404, 'normal'],
      ['delayed missing', '/pages/ru/about', 404, 'delayed-missing'],
      ['wrong locale', '/pages/en/about', 404, 'normal'],
      ['API 500', '/pages/ru/about', 500, 'api-500'],
      ['delayed API 500', '/pages/ru/about', 500, 'delayed-500'],
      ['malformed JSON', '/pages/ru/about', 500, 'malformed-json'],
      ['unsafe Blocks', '/pages/ru/about', 500, 'unsafe-blocks'],
      ['mismatched API locale', '/pages/ru/about', 500, 'mismatched-locale'],
      ['five-second API timeout', '/pages/ru/about', 500, 'timeout'],
    ]) {
      mode = selectedMode;
      await check(name, path, expected, ua, { minimumMs: mode === 'timeout' ? 4800 : 0 });
    }
    mode = 'normal';
    for (const path of ['/', '/company', '/catalog', '/catalog/compare', '/catalog/source', '/selection', '/inquiry', '/manufacturers', '/solutions', '/projects', '/contacts', '/documents', '/workspace', '/login', '/admin/catalog']) {
      await check('existing route and shared shell', path, 200, ua, { maximumReads: 0, sharedShell: true });
    }
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.message; process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  if (!interrupted) await shutdown();
  report.finishedAt = new Date().toISOString();
  await writeFile(join(evidence, 'fault-matrix-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  await Promise.all([new Promise(done => nextLog.end(done)), new Promise(done => apiLog.end(done))]);
  console.log(JSON.stringify({ kind: report.kind, status: report.status, cases: report.cases.length, ...(report.error ? { error: report.error } : {}) }));
}

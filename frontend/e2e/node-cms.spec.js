import { expect, test } from '@playwright/test';

// Native Strapi sessions, with no B2B bearer substitution or token injection.
// Live CRUD/conflict/RBAC cases are unmocked. Two separate interruption tests
// inject a single 401 response and keep native refresh/retry handling real.
const cms = process.env.E2E_CMS_BASE_URL || 'http://127.0.0.1:8016/cms';
const origin = new URL(cms).origin;
const api = process.env.E2E_API_URL || `${origin}/api/v1`;
const frontend = process.env.E2E_BASE_URL || 'http://127.0.0.1:3141';
const plugin = `${origin}/alageum-catalog`;
const emails = { editor: 'cms-editor@node-ci.example', denied: 'cms-denied@node-ci.example' };
test.beforeAll(() => {
  expect(process.env.APP_ENV, 'This suite mutates disposable local test fixtures only').toBe('test');
  for (const url of [cms, api, frontend]) {
    expect(['127.0.0.1', 'localhost', '[::1]']).toContain(new URL(url).hostname);
  }
  expect(new URL(api).origin).toBe(origin);
});

async function nativeLogin(page, kind = 'editor') {
  const password = process.env[`E2E_CMS_${kind.toUpperCase()}_PASSWORD`];
  expect(password, 'Run the explicit disposable native CMS fixture first').toBeTruthy();
  await page.goto(`${cms}/auth/login`);
  await page.getByRole('textbox', { name: /^email(?:\s*\*)?$/i }).fill(emails[kind]);
  await page.getByLabel(/^password(?:\s*\*)?$/i).fill(password);
  const responsePromise = page.waitForResponse(response => response.url() === `${origin}/admin/login` && response.request().method() === 'POST');
  await page.getByRole('button', { name: /^(login|log in)$/i }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.user.email).toBe(emails[kind]);
  expect(data.user.roles.some(role => role.code === 'strapi-super-admin')).toBe(false);
  await expect(page).not.toHaveURL(/\/auth\/login/);
  return data.token || data.accessToken;
}
async function openProduct(page, product) {
  await page.goto(`${cms}/plugins/alageum-catalog`);
  await page.getByLabel('Search catalog', { exact: true }).fill(product.public_key);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: product.translations.ru.name, exact: true }).click();
  await expect(page.getByLabel('Version', { exact: true })).toHaveValue(String(product.version));
}
async function publicProduct(request, key) {
  const response = await request.get(`${api}/catalog/products/${key}`);
  expect(response.status()).toBe(200);
  return response.json();
}
async function mutation(page, id, button, suffix = '', expected = 200) {
  const method = suffix ? 'POST' : 'PUT';
  const responsePromise = page.waitForResponse(response => response.url() === `${plugin}/products/${id}${suffix}` && response.request().method() === method);
  await page.getByRole('button', { name: button, exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(expected);
  return response.json();
}

test('native CMS login and guarded edits publish to the API and Next catalog', async ({ page, request }, testInfo) => {
  const original = await publicProduct(request, 'tmg-400');
  await nativeLogin(page);
  await expect(page.getByRole('link', { name: 'ALAGEUM catalog', exact: true })).toBeVisible();
  const cookies = await page.context().cookies(`${origin}/admin/access-token`);
  const refreshCookie = cookies.find(cookie => cookie.name === 'strapi_admin_refresh');
  expect(refreshCookie?.httpOnly).toBe(true);
  expect(refreshCookie?.path).toBe('/');
  await page.reload();
  await expect(page.getByRole('link', { name: 'ALAGEUM catalog', exact: true })).toBeVisible();
  await openProduct(page, original);
  const title = `CMS published ${Date.now()}`;
  await page.getByLabel('Name (RU)', { exact: true }).fill(title);
  await page.getByLabel('Description (RU)', { exact: true }).fill('Edited through the native guarded Strapi CMS');
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await mutation(page, original.id, 'Save product');
  const saved = await publicProduct(request, original.id);
  expect(saved.public_key).toBe(original.public_key);
  expect(saved.translations.ru.name).toBe(title);
  expect(saved.version).toBe(original.version + 1);
  for (const language of Object.keys(original.translations).filter(value => value !== 'ru')) {
    expect(saved.translations[language]).toEqual(original.translations[language]);
  }
  await page.goto(`${frontend}/catalog/${original.public_key}?source=api`);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await openProduct(page, saved);
  await mutation(page, saved.id, 'Hide product', '/hide');
  expect((await request.get(`${api}/catalog/products/${saved.id}`)).status()).toBe(404);
  await mutation(page, saved.id, 'Restore draft', '/restore');
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('draft');
  expect((await request.get(`${api}/catalog/products/${saved.id}`)).status()).toBe(404);
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await mutation(page, saved.id, 'Save product');
  expect((await publicProduct(request, saved.id)).translations.ru.name).toBe(title);
  await testInfo.attach('native-cms-guarded-editor', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('two native CMS sessions preserve a stale local edit and reject its version conflict', async ({ page, browser, request }) => {
  const original = await publicProduct(request, 'tmg-630');
  await nativeLogin(page);
  await openProduct(page, original);
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await nativeLogin(other);
    await openProduct(other, original);
    const winner = `CMS winner ${Date.now()}`;
    await page.getByLabel('Name (RU)', { exact: true }).fill(winner);
    await mutation(page, original.id, 'Save product');
    await other.getByLabel('Name (RU)', { exact: true }).fill('Unsaved stale CMS draft');
    await mutation(other, original.id, 'Save product', '', 409);
    await expect(other.getByLabel('Name (RU)', { exact: true })).toHaveValue('Unsaved stale CMS draft');
    await expect(other.getByText('This product changed. Reload the product before saving again. Your edits have not been saved.', { exact: true })).toBeVisible();
    const saved = await publicProduct(request, original.id);
    expect(saved.translations.ru.name).toBe(winner);
    expect(saved.version).toBe(original.version + 1);
  } finally { await otherContext.close(); }
});

test('a native administrator without the explicit catalog permission cannot read or edit', async ({ page, request }) => {
  const product = await publicProduct(request, 'tmg-1000');
  const token = await nativeLogin(page, 'denied');
  await expect(page.getByRole('link', { name: 'ALAGEUM catalog', exact: true })).toHaveCount(0);
  const headers = { Authorization: `Bearer ${token}` };
  expect((await request.get(`${plugin}/products`, { headers })).status()).toBe(403);
  expect((await request.patch(`${plugin}/products/${product.id}`, { headers, data: { version: product.version, translations: { ru: { name: 'Denied CMS overwrite' } } } })).status()).toBe(403);
  await page.goto(`${cms}/plugins/alageum-catalog`);
  await expect(page.getByRole('button', { name: 'Save product', exact: true })).toHaveCount(0);
  expect((await publicProduct(request, product.id)).translations).toEqual(product.translations);
  // CMS administrator tokens are never accepted as business identities.
  expect((await request.get(`${api}/auth/me`, { headers })).status()).toBe(401);
});

test('native read refresh rotates the session and preserves the unsaved CMS draft', async ({ page, request }) => {
  const product = await publicProduct(request, 'tmg-1000');
  await nativeLogin(page);
  await openProduct(page, product);
  await page.getByLabel('Name (RU)', { exact: true }).fill('Unsaved draft survives native refresh');
  const before = (await page.context().cookies(`${origin}/admin/access-token`)).find(cookie => cookie.name === 'strapi_admin_refresh');
  expect(before?.path).toBe('/');
  let interruptions = 0;
  await page.route(`${plugin}/products?**`, async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET' && url.searchParams.get('q') === 'tmg' && interruptions === 0) {
      interruptions += 1;
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { status: 401, name: 'UnauthorizedError', message: 'Deterministic expired access token', details: {} } }) });
    } else await route.continue();
  });
  const refreshPromise = page.waitForResponse(response => response.url() === `${origin}/admin/access-token` && response.request().method() === 'POST');
  const retriedRead = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === origin && url.pathname === '/alageum-catalog/products' && url.searchParams.get('q') === 'tmg' && response.status() === 200;
  });
  await page.getByLabel('Search catalog', { exact: true }).fill('tmg');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const refreshed = await refreshPromise;
  expect(refreshed.status()).toBe(200);
  expect((await refreshed.json()).data.token).toBeTruthy();
  await retriedRead;
  expect(interruptions).toBe(1);
  const after = (await page.context().cookies(`${origin}/admin/access-token`)).find(cookie => cookie.name === 'strapi_admin_refresh');
  expect(after?.httpOnly).toBe(true);
  expect(after?.path).toBe('/');
  expect(after?.value).not.toBe(before?.value);
  await expect(page.getByLabel('Name (RU)', { exact: true })).toHaveValue('Unsaved draft survives native refresh');
  await expect(page.getByLabel('Version', { exact: true })).toHaveValue(String(product.version));
  await expect(page.getByRole('button', { name: 'Save product', exact: true })).toBeEnabled();
  expect((await publicProduct(request, product.id)).translations).toEqual(product.translations);
});

test('401 writes never retry and late CMS responses respect Close and browser history', async ({ page, request }) => {
  const product = await publicProduct(request, 'tmg-1000');
  await nativeLogin(page);
  await openProduct(page, product);
  const draft = 'Private unsaved edit after an expired CMS write';
  await page.getByLabel('Name (RU)', { exact: true }).fill(draft);
  let writes = 0;
  await page.route(`${plugin}/products/${product.id}`, async route => {
    if (route.request().method() === 'PUT') {
      writes += 1;
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { status: 401, name: 'UnauthorizedError', message: 'Deterministic expired CMS mutation', details: {} } }) });
    } else await route.continue();
  });
  await mutation(page, product.id, 'Save product', '', 401);
  await expect(page.getByRole('alert')).toContainText('Your CMS account does not have access to manage this catalog');
  await expect(page.getByRole('button', { name: 'Save product', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Name (RU)', { exact: true })).toHaveValue(draft);
  expect(writes).toBe(1);
  expect((await publicProduct(request, product.id)).translations).toEqual(product.translations);
  await page.unroute(`${plugin}/products/${product.id}`);

  // Reuse this native session to remain inside the native 5-login rate limit.
  // Delays wrap real server responses; neither detail nor save data is invented.
  const earlier = await publicProduct(request, 'tmg-630');
  let releaseDetail, releaseSave, deliveredDetail, deliveredSave;
  const detailGate = new Promise(resolve => { releaseDetail = resolve; });
  const saveGate = new Promise(resolve => { releaseSave = resolve; });
  const detailFinished = new Promise(resolve => { deliveredDetail = resolve; });
  const saveFinished = new Promise(resolve => { deliveredSave = resolve; });
  async function deliverHeld(route, response, done) {
    try { await route.fulfill({ response }); }
    catch (error) {
      // Native useFetchClient aborts requests when the editor unmounts.
      // Only a verified browser cancellation is acceptable here.
      if (!route.request().failure()?.errorText?.includes('ERR_ABORTED')) throw error;
    } finally { done(); }
  }
  const settleFrames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  let detailHeld = false, saveHeld = false;
  try {
    await test.step('late detail cannot reopen a closed editor over a newer selection', async () => {
      await page.getByRole('button', { name: 'Close editor', exact: true }).click();
      await page.getByLabel('Search catalog', { exact: true }).fill('tmg');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.route(`${plugin}/products/${earlier.id}`, async route => {
        if (route.request().method() === 'GET' && !detailHeld) {
          const response = await route.fetch();
          expect(response.status()).toBe(200);
          detailHeld = true;
          await detailGate;
          await deliverHeld(route, response, deliveredDetail);
        } else await route.continue();
      });
      await page.getByRole('button', { name: earlier.translations.ru.name, exact: true }).click();
      await expect.poll(() => detailHeld).toBe(true);
      await page.getByRole('button', { name: 'Close editor', exact: true }).click();
      await page.getByRole('button', { name: product.translations.ru.name, exact: true }).click();
      await expect(page.getByLabel('Public key', { exact: true })).toHaveValue(product.public_key);
      releaseDetail();
      await detailFinished;
      await settleFrames();
      await expect(page.getByLabel('Public key', { exact: true })).toHaveValue(product.public_key);
      await expect(page).toHaveURL(new RegExp(`product=${product.id}`));
      await page.goBack();
      await expect(page.getByRole('region', { name: 'Catalog product editor', exact: true })).toHaveCount(0);
      await page.goForward();
      await expect(page.getByLabel('Public key', { exact: true })).toHaveValue(product.public_key);
    });
    await test.step('late successful save preserves a newer selection and Back/Forward', async () => {
      await page.route(`${plugin}/products/${product.id}`, async route => {
        if (route.request().method() === 'PUT' && !saveHeld) {
          const response = await route.fetch();
          expect(response.status()).toBe(200);
          saveHeld = true;
          await saveGate;
          await deliverHeld(route, response, deliveredSave);
        } else await route.continue();
      });
      const title = `CMS delayed save ${Date.now()}`;
      await page.getByLabel('Name (RU)', { exact: true }).fill(title);
      await page.getByRole('button', { name: 'Save product', exact: true }).click();
      await expect.poll(() => saveHeld).toBe(true);
      await page.getByRole('button', { name: 'Close editor', exact: true }).click();
      await page.getByRole('button', { name: earlier.translations.ru.name, exact: true }).click();
      await expect(page.getByLabel('Public key', { exact: true })).toHaveValue(earlier.public_key);
      releaseSave();
      await saveFinished;
      await settleFrames();
      await expect(page.getByLabel('Public key', { exact: true })).toHaveValue(earlier.public_key);
      await expect(page).toHaveURL(new RegExp(`product=${earlier.id}`));
      await page.goBack();
      await expect(page.getByRole('region', { name: 'Catalog product editor', exact: true })).toHaveCount(0);
      await page.goForward();
      await expect(page.getByLabel('Public key', { exact: true })).toHaveValue(earlier.public_key);
      const persisted = await publicProduct(request, product.id);
      expect(persisted.translations.ru.name).toBe(title);
      expect(persisted.version).toBe(product.version + 1);
    });
  } finally { releaseDetail(); releaseSave(); }
});

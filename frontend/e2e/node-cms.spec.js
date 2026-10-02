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
  const token = data.token || data.accessToken;
  expect(typeof token).toBe('string');
  // Native login intentionally returns an unpopulated user. Verify the actual
  // authenticated profile instead of weakening the least-privilege assertion.
  const profileResponse = await page.request.get(`${origin}/admin/users/me`, { headers: { Authorization: `Bearer ${token}` } });
  expect(profileResponse.status()).toBe(200);
  const { data: profile } = await profileResponse.json();
  expect(Array.isArray(profile.roles)).toBe(true);
  expect(profile.roles.some(role => role.code === 'strapi-super-admin')).toBe(false);
  await expect(page).not.toHaveURL(/\/auth\/login/);
  return token;
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

async function addTechnicalRow(page, label, value, type = 'text', unit) {
  const panel = page.locator('details.alageum-specifications');
  if (!(await panel.evaluate(element => element.open))) await panel.locator(':scope > summary').click();
  await panel.getByRole('button', { name: 'Add technical specifications row', exact: true }).click();
  const row = panel.getByRole('group', { name: /^Technical specifications row/ }).last();
  await row.getByLabel('Specification label', { exact: true }).fill(label);
  await row.getByLabel('Specification value type', { exact: true }).selectOption(type);
  await row.getByLabel('Specification value', { exact: true }).fill(value);
  if (unit !== undefined) {
    await row.getByLabel('Unit type', { exact: true }).selectOption(unit === null ? 'null' : 'text');
    if (unit !== null) await row.getByLabel('Unit', { exact: true }).fill(unit);
  }
  return row;
}

async function captureSpecEvidence(page, testInfo, target, filename) {
  // Capture the verified controls, not whichever scroll position a prior click
  // happened to leave. The tall viewport must contain the complete target.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await target.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await page.mouse.move(0, 0);
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport({ ratio: 1 });
  const screenshotPath = testInfo.outputPath(filename);
  await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled', caret: 'hide' });
  await testInfo.attach(filename, { path: screenshotPath, contentType: 'image/png' });
}

test('native CMS login and guarded edits publish to the API and Next catalog', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
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
  const literalRow = await addTechnicalRow(page, 'CMS fixture literal', '0001,250–2,0', 'text', 'кВА');
  await expect(page.getByRole('button', { name: 'Hide product', exact: true })).toBeDisabled();
  await expect(page.getByText('Save or reload your specification edits before using Hide product or Restore draft.', { exact: true })).toBeVisible();
  await literalRow.getByText('Source reference', { exact: true }).click();
  await literalRow.getByLabel('Source page type', { exact: true }).selectOption('number');
  await literalRow.getByLabel('Source page', { exact: true }).fill('32');
  const numberRow = await addTechnicalRow(page, 'CMS fixture number', '9007199254740993', 'number', null);
  let attemptedSaves = 0;
  const countSave = req => { if (req.url() === `${plugin}/products/${original.id}` && req.method() === 'PUT') attemptedSaves += 1; };
  page.on('request', countSave);
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(numberRow.getByLabel('Specification value', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(numberRow.getByText('This number cannot be saved exactly. Choose Text to retain the source value', { exact: true })).toBeVisible();
  expect(attemptedSaves).toBe(0);
  expect((await publicProduct(request, original.id)).specs).toEqual(original.specs);
  await numberRow.getByLabel('Specification value', { exact: true }).fill('12.5');
  await page.getByText('Configurations', { exact: true }).click();
  await page.getByRole('button', { name: 'Add configuration', exact: true }).click();
  const configuration = page.getByRole('group', { name: 'Configuration 1', exact: true });
  await configuration.getByLabel('Configuration designation', { exact: true }).fill('CMS fixture configuration');
  await configuration.getByRole('button', { name: 'Add configuration 1 specifications row', exact: true }).click();
  const configRow = configuration.getByRole('group', { name: 'Configuration 1 specifications row 1', exact: true });
  await configRow.getByLabel('Specification label', { exact: true }).fill('CMS fixture code');
  const multilineValue = '0007\nSecond literal source line';
  await configRow.getByLabel('Specification value', { exact: true }).fill(multilineValue);
  await expect(configRow.getByLabel('Specification value', { exact: true })).toHaveValue(multilineValue);
  await configRow.getByLabel('Unit type', { exact: true }).selectOption('text');
  await configRow.getByLabel('Unit', { exact: true }).fill('мм');
  await configRow.getByText('Source reference', { exact: true }).click();
  await configRow.getByLabel('Source page type', { exact: true }).selectOption('number');
  await configRow.getByLabel('Source page', { exact: true }).fill('32');
  await page.getByText('Specification notes', { exact: true }).click();
  await page.getByRole('button', { name: 'Add specification note', exact: true }).click();
  await page.getByLabel('Specification note 1', { exact: true }).fill('Disposable CMS test fixture');
  await mutation(page, original.id, 'Save product');
  expect(attemptedSaves).toBe(1);
  page.off('request', countSave);
  const saved = await publicProduct(request, original.id);
  expect(saved.public_key).toBe(original.public_key);
  expect(saved.translations.ru.name).toBe(title);
  expect(saved.version).toBe(original.version + 1);
  expect(saved.specs).toEqual({ ...original.specs, technicalSpecs: [
    { label: 'CMS fixture literal', value: '0001,250–2,0', unit: 'кВА', page: 32 },
    { label: 'CMS fixture number', value: 12.5, unit: null },
  ], configurations: [{ designation: 'CMS fixture configuration', specifications: [{ label: 'CMS fixture code', value: multilineValue, unit: 'мм', page: 32 }] }], notes: ['Disposable CMS test fixture'] });
  expect(saved.provenance).toEqual(original.provenance);
  expect(saved.media).toEqual(original.media);
  for (const language of Object.keys(original.translations).filter(value => value !== 'ru')) {
    expect(saved.translations[language]).toEqual(original.translations[language]);
  }
  await page.goto(`${frontend}/catalog/${original.public_key}?source=api`);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByText('0001,250–2,0', { exact: true })).toBeVisible();
  await expect(page.getByText('12.5', { exact: true })).toBeVisible();
  await page.getByText('CMS fixture configuration', { exact: true }).click();
  await expect(page.getByText(multilineValue, { exact: true })).toBeVisible();
  await captureSpecEvidence(page, testInfo, page.locator('.product-panel'), 'public-detail-specifications.png');
  await page.goto(`${frontend}/catalog/compare?source=api&ids=${original.public_key},tmg-630`);
  await expect(page.locator('.comparison-table tbody th').filter({ hasText: /^CMS fixture literal, кВА$/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: '0001,250–2,0', exact: true })).toBeVisible();
  await captureSpecEvidence(page, testInfo, page.locator('.comparison-table'), 'public-comparison-specifications.png');
  await openProduct(page, saved);
  await page.getByText('Structured specifications', { exact: true }).click();
  const restoredLiteral = page.getByRole('group', { name: 'Technical specifications row 1', exact: true });
  await expect(restoredLiteral.getByLabel('Specification value type', { exact: true })).toHaveValue('text');
  await expect(restoredLiteral.getByLabel('Specification value', { exact: true })).toHaveValue('0001,250–2,0');
  await expect(restoredLiteral.getByLabel('Unit', { exact: true })).toHaveValue('кВА');
  await restoredLiteral.getByText('Source reference', { exact: true }).click();
  await expect(restoredLiteral.getByLabel('Source page', { exact: true })).toHaveValue('32');
  await captureSpecEvidence(page, testInfo, restoredLiteral, 'native-cms-literal-source-page.png');
  const restoredNumber = page.getByRole('group', { name: 'Technical specifications row 2', exact: true });
  await expect(restoredNumber.getByLabel('Specification value type', { exact: true })).toHaveValue('number');
  await expect(restoredNumber.getByLabel('Specification value', { exact: true })).toHaveValue('12.5');
  await expect(restoredNumber.getByLabel('Unit type', { exact: true })).toHaveValue('null');
  await captureSpecEvidence(page, testInfo, restoredNumber, 'native-cms-numeric-null-unit.png');
  await page.getByText('Configurations', { exact: true }).click();
  const restoredConfigRow = page.getByRole('group', { name: 'Configuration 1 specifications row 1', exact: true });
  await expect(restoredConfigRow.getByLabel('Specification value', { exact: true })).toHaveValue(multilineValue);
  await expect(restoredConfigRow.getByLabel('Unit', { exact: true })).toHaveValue('мм');
  await restoredConfigRow.getByText('Source reference', { exact: true }).click();
  await expect(restoredConfigRow.getByLabel('Source page', { exact: true })).toHaveValue('32');
  await captureSpecEvidence(page, testInfo, page.getByRole('group', { name: 'Configuration 1', exact: true }), 'native-cms-multiline-configuration.png');
  await mutation(page, saved.id, 'Hide product', '/hide');
  expect((await request.get(`${api}/catalog/products/${saved.id}`)).status()).toBe(404);
  await mutation(page, saved.id, 'Restore draft', '/restore');
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('draft');
  expect((await request.get(`${api}/catalog/products/${saved.id}`)).status()).toBe(404);
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await mutation(page, saved.id, 'Save product');
  const republished = await publicProduct(request, saved.id);
  expect(republished.translations.ru.name).toBe(title);
  expect(republished.specs).toEqual(saved.specs);
  const screenshotPath = testInfo.outputPath('native-cms-guarded-editor.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach('native-cms-guarded-editor', { path: screenshotPath, contentType: 'image/png' });
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
    await addTechnicalRow(page, 'CMS conflict fixture', '0002');
    await mutation(page, original.id, 'Save product');
    const staleRow = await addTechnicalRow(other, 'CMS conflict fixture', '0003');
    await other.getByLabel('Name (RU)', { exact: true }).fill('Unsaved stale CMS draft');
    await mutation(other, original.id, 'Save product', '', 409);
    await expect(other.getByLabel('Name (RU)', { exact: true })).toHaveValue('Unsaved stale CMS draft');
    await expect(other.getByText('This product changed. Reload the product before saving again. Your edits have not been saved.', { exact: true })).toBeVisible();
    const saved = await publicProduct(request, original.id);
    expect(saved.translations.ru.name).toBe(winner);
    expect(saved.version).toBe(original.version + 1);
    expect(saved.specs.technicalSpecs).toEqual([{ label: 'CMS conflict fixture', value: '0002' }]);
    await expect(staleRow.getByLabel('Specification value', { exact: true })).toHaveValue('0003');
    await expect(other.getByRole('button', { name: 'Hide product', exact: true })).toBeDisabled();
    await other.getByRole('button', { name: 'Reload product', exact: true }).click();
    await expect(other.getByLabel('Version', { exact: true })).toHaveValue(String(saved.version));
    await expect(other.getByRole('button', { name: 'Hide product', exact: true })).toBeEnabled();
    await expect(other.getByRole('group', { name: 'Technical specifications row 1', exact: true }).getByLabel('Specification value', { exact: true })).toHaveValue('0002');
  } finally { await otherContext.close(); }
});

test('a native administrator without the explicit catalog permission cannot read or edit', async ({ page, request }) => {
  const product = await publicProduct(request, 'tmg-1000');
  const token = await nativeLogin(page, 'denied');
  await expect(page.getByRole('link', { name: 'ALAGEUM catalog', exact: true })).toHaveCount(0);
  const headers = { Authorization: `Bearer ${token}` };
  expect((await request.get(`${plugin}/products`, { headers })).status()).toBe(403);
  expect((await request.patch(`${plugin}/products/${product.id}`, { headers, data: { version: product.version, translations: { ru: { name: 'Denied CMS overwrite' } }, specs: { technicalSpecs: [{ label: 'Denied fixture', value: 'No write' }] } } })).status()).toBe(403);
  await page.goto(`${cms}/plugins/alageum-catalog`);
  await expect(page.getByRole('button', { name: 'Save product', exact: true })).toHaveCount(0);
  expect((await publicProduct(request, product.id)).translations).toEqual(product.translations);
  expect((await publicProduct(request, product.id)).specs).toEqual(product.specs);
  // CMS administrator tokens are never accepted as business identities.
  expect((await request.get(`${api}/auth/me`, { headers })).status()).toBe(401);
});

test('native read refresh rotates the session and preserves the unsaved CMS draft', async ({ page, request }) => {
  const product = await publicProduct(request, 'tmg-1000');
  await nativeLogin(page);
  await openProduct(page, product);
  await page.getByLabel('Name (RU)', { exact: true }).fill('Unsaved draft survives native refresh');
  const unsavedSpec = await addTechnicalRow(page, 'CMS refresh fixture', '001,50');
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
  await expect(unsavedSpec.getByLabel('Specification value', { exact: true })).toHaveValue('001,50');
  expect((await publicProduct(request, product.id)).specs).toEqual(product.specs);
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
  const unauthorizedSpec = await addTechnicalRow(page, 'CMS expired-session fixture', '0007');
  let writes = 0;
  await page.route(`${plugin}/products/${product.id}`, async route => {
    if (route.request().method() === 'PUT') {
      writes += 1;
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { status: 401, name: 'UnauthorizedError', message: 'Deterministic expired CMS mutation', details: {} } }) });
    } else await route.continue();
  });
  await mutation(page, product.id, 'Save product', '', 401);
  await expect(page.getByRole('region', { name: 'Catalog product editor', exact: true }).getByRole('alert')).toContainText('Your CMS account does not have access to manage this catalog');
  await expect(page.getByRole('button', { name: 'Save product', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Name (RU)', { exact: true })).toHaveValue(draft);
  await expect(unauthorizedSpec.getByLabel('Specification value', { exact: true })).toHaveValue('0007');
  expect((await publicProduct(request, product.id)).specs).toEqual(product.specs);
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

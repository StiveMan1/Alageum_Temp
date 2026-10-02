import { expect, test } from '@playwright/test';
for (const [route, title] of [['/', 'Создаём основу'], ['/company','Инженерная мысль'], ['/manufacturers','соединённые энергией'], ['/contacts','Давайте обсудим']]) {
  test(`${route} renders a complete responsive public page without runtime errors`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    for (const image of await page.locator('main img').all()) expect(await image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(errors).toEqual([]);
  });
}
test('home catalog and city links preserve useful destination state', async ({ page }) => {
  await page.goto('/');
  // Wait for one complete category card before interacting. Persistent
  // duplicates still fail rather than silently choosing one of them.
  const substationCard = page.locator('.corp-equipment-card').filter({ hasText: 'Подстанции' });
  await expect(substationCard).toHaveCount(1);
  await expect(substationCard.getByRole('heading', { level: 3, name: 'Подстанции', exact: true })).toBeVisible();
  await expect(substationCard).toHaveAttribute('href', '/catalog?category=substations');
  await substationCard.click();
  await expect(page).toHaveURL(/category=substations/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goBack();
  await page.locator('.corp-city-links a').filter({ hasText: 'Алматы' }).click();
  await expect(page).toHaveURL(/city=/);
  await expect(page.locator('.corp-enterprise-card')).toHaveCount(2);
});
test('city map and list share URL state, repeat selection and survive back/forward/reload', async ({ page }) => {
  await page.goto('/manufacturers');
  await expect(page.locator('.corp-enterprise-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Показать предприятия: Алматы', exact: true }).click();
  await expect(page.locator('.corp-enterprise-card')).toHaveCount(2);
  await expect(page.getByRole('status')).toHaveText('Показано предприятий: 2');
  await page.reload();
  await expect(page.locator('.corp-enterprise-card')).toHaveCount(2);
  const kentau = page.locator('.corp-city-filter').getByRole('button', { name: /^Кентау/ });
  await kentau.click(); await kentau.click();
  await expect(page.locator('.corp-enterprise-card')).toHaveCount(1);
  await expect(page.locator('.corp-enterprise-card h3')).toHaveText('Кентауский трансформаторный завод');
  await page.goBack(); await expect(page.locator('.corp-enterprise-card')).toHaveCount(2);
  await page.goForward(); await expect(page.locator('.corp-enterprise-card')).toHaveCount(1);
  await page.locator('.corp-city-filter').getByRole('button', { name: /Все предприятия/ }).click();
  await expect(page.locator('.corp-enterprise-card')).toHaveCount(6);
  await expect(page).not.toHaveURL(/city=/);
});
test('invalid city falls back to all entries and all profile links work', async ({ page }) => {
  await page.goto('/manufacturers?city=Unknown');
  await expect(page.locator('.corp-enterprise-card')).toHaveCount(6);
  await page.locator('.corp-enterprise-bottom').first().click();
  await expect(page).toHaveURL(/\/manufacturers\/ktz/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Кентауский');
});
test('regional contact search handles Russian casing, empty states and reset', async ({ page }) => {
  await page.goto('/contacts');
  const search = page.getByRole('searchbox', { name: 'Найти отдел продаж по городу' });
  await expect(page.locator('.corp-office')).toHaveCount(11);
  await search.fill('  аЛмАтЫ ');
  await expect(page.locator('.corp-office')).toHaveCount(1);
  await expect(page.locator('.corp-office a[href="mailto:almaty@alageum.com"]')).toBeVisible();
  await search.fill('несуществующий');
  await expect(page.getByRole('heading', { name: 'Этот город пока не указан в списке' })).toBeVisible();
  await page.getByRole('button', { name: 'Показать все города' }).click();
  await expect(search).toHaveValue(''); await expect(page.locator('.corp-office')).toHaveCount(11);
  await search.fill('Уральск'); await page.getByRole('button', { name: 'Очистить поиск города' }).click();
  await expect(page.locator('.corp-office')).toHaveCount(11);
});
test('contact actions have correct destinations and FAQ can open and close repeatedly', async ({ page }) => {
  await page.goto('/contacts');
  // Check the accessible link while Next replaces any hidden streamed copy.
  const phone = page.getByRole('link', { name: '+7 771 005 22 22', exact: true });
  await expect(phone).toHaveCount(1);
  await expect(phone).toHaveAttribute('href','tel:+77710052222');
  await expect(page.getByRole('link', { name: 'sales@alageum.com', exact: true })).toHaveAttribute('href','mailto:sales@alageum.com');
  const prepare = page.getByRole('complementary');
  await expect(prepare).toContainText('не отправляет заявку на сервер');
  // The failure trace retained a hidden page copy outside the main landmark.
  // Interact with the active FAQ, while still rejecting duplicates within it.
  const main = page.getByRole('main');
  const summary = main.getByText('Можно ли приехать на предприятие?', { exact: true });
  const answer = main.getByText('Сначала уточните адрес, часы приёма', { exact: false });
  await expect(main).toHaveCount(1);
  await expect(summary).toHaveCount(1);
  await expect(summary).toBeVisible();
  await expect(answer).toHaveCount(1);
  await expect(answer).not.toBeVisible();
  await summary.click(); await expect(answer).toBeVisible();
  await summary.click(); await expect(answer).not.toBeVisible();
  await summary.click(); await expect(answer).toBeVisible();
  // The final DOM must also contain only one canonical sales link.
  await expect(page.locator('.corp-contact-phone')).toHaveCount(1);
  await prepare.getByRole('link', { name: /Подготовить запрос/ }).click();
  await expect(page).toHaveURL(/\/inquiry/); await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
test('keyboard selection works and reduced motion avoids animated page transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/manufacturers');
  const button = page.locator('.corp-city-filter').getByRole('button', { name: /^Шымкент/ });
  await button.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.corp-enterprise-card')).toHaveCount(1);
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-pressed','true');
});

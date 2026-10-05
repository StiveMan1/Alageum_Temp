import { expect, test } from "@playwright/test";
import catalogRelease from "../../backend-node/data/catalog-release.json" with { type: "json" };
import { expectCatalogViewport, expectReceivesPointer } from "./helpers/catalog-viewport";

const selectionKey = "alageum.catalog.selection.v1";
const catalogRows = (page) => page.getByRole("region", { name: "Таблица оборудования, прокрутка по горизонтали" }).locator("tbody tr");
const foundCount = (page) => page.getByRole("status").filter({ hasText: "Найдено:" });

async function openFilters(page) {
  const toggle = page.getByRole("button", { name: /Параметры и категории/ });
  if (await toggle.isVisible() && await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
  return page.getByRole("complementary", { name: "Фильтры каталога" });
}

async function expectShell(page) {
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "ALAGEUM Electric — главная" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function expectDecodedImage(image) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0), {
    message: "The referenced source image must load and decode, not merely have a valid-looking src",
  }).toBe(true);
}

async function canvasEvidence(canvas, testInfo, name, previous = null) {
  const png = await canvas.screenshot({ animations: "disabled" });
  // Decode actual Playwright screenshots with built-in browser APIs. Detached
  // 2D canvases neither modify the page nor depend on optional native packages.
  const metrics = await canvas.page().evaluate(async ({ current, previous }) => {
    async function decode(base64) {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const copy = document.createElement("canvas");
      copy.width = image.naturalWidth;
      copy.height = image.naturalHeight;
      const context = copy.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, copy.width, copy.height);
    }
    const image = await decode(current);
    const before = previous ? await decode(previous) : null;
    if (before && (before.width !== image.width || before.height !== image.height)) throw new Error("Canvas size changed during rotation");
    let darkPixels = 0;
    let changedPixels = 0;
    const colors = new Set();
    // Ignore the focus ring and edges. The empty radial background is lighter
    // than 200, so DOM readiness or a blank canvas cannot pass this check.
    for (let y = 12; y < image.height - 12; y += 1) {
      for (let x = 12; x < image.width - 12; x += 1) {
        const offset = (y * image.width + x) * 4;
        const rgb = [...image.data.subarray(offset, offset + 3)];
        if (Math.min(...rgb) < 200) darkPixels += 1;
        colors.add(rgb.map(value => Math.floor(value / 8)).join(","));
        if (before && rgb.reduce((sum, value, channel) => sum + Math.abs(value - before.data[offset + channel]), 0) > 30) changedPixels += 1;
      }
    }
    return { width: image.width, height: image.height, darkPixels, colors: colors.size, changedPixels };
  }, { current: png.toString("base64"), previous: previous?.png.toString("base64") || null });
  await testInfo.attach(`${name}.png`, { body: png, contentType: "image/png" });
  await testInfo.attach(`${name}-pixels.json`, { body: Buffer.from(JSON.stringify(metrics)), contentType: "application/json" });
  expect(metrics.darkPixels, "A real rendered model must occupy the interior of the canvas").toBeGreaterThan(metrics.width * metrics.height * 0.01);
  expect(metrics.colors, "A rendered model must have more than the empty background's colors").toBeGreaterThan(12);
  return { png, ...metrics };
}

test("demo catalog opens without backend requests and shares the site shell", async ({ page }) => {
  const apiRequests = [];
  page.on("request", (request) => { if (/\/api\/v1\//.test(request.url())) apiRequests.push(request.url()); });
  await page.goto("/catalog?source=demo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Найдите оборудование\s*по параметрам/);
  await expect(page.getByText("Демонстрационный каталог", { exact: true })).toBeVisible();
  await expect(foundCount(page)).toHaveText("Найдено: 9");
  await expect(catalogRows(page)).toHaveCount(6);
  await expectShell(page);
  expect(apiRequests).toEqual([]);
});

test("search persists in the URL and handles empty results and reset", async ({ page }) => {
  await page.goto("/catalog?source=demo");
  await page.getByLabel("Поиск по каталогу").fill("DEMO-001");
  await page.getByLabel("Поиск по каталогу").press("Enter");
  await expect(page).toHaveURL(/q=DEMO-001/);
  await expect(catalogRows(page)).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Demo Transformer A", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Поиск по каталогу")).toHaveValue("DEMO-001");
  await page.getByLabel("Поиск по каталогу").fill("нет-такого-оборудования");
  await page.getByRole("button", { name: "Найти", exact: true }).click();
  await expect(page.getByRole("heading", { name: "По этим параметрам ничего не найдено" })).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры", exact: true }).click();
  await expect(foundCount(page)).toHaveText("Найдено: 9");
  await expect(page.getByLabel("Поиск по каталогу")).toHaveValue("");
});

test("category and parameter filters survive reload and back-forward navigation", async ({ page }) => {
  await page.goto("/catalog?source=demo");
  const filters = await openFilters(page);
  await filters.getByRole("button", { name: /^Трансформаторы/ }).click();
  await expect(foundCount(page)).toHaveText("Найдено: 5");
  await filters.getByLabel("Охлаждение", { exact: true }).selectOption("Сухое");
  await expect(foundCount(page)).toHaveText("Найдено: 2");
  await filters.getByLabel("Мощность, кВА", { exact: true }).selectOption("1600");
  await expect(foundCount(page)).toHaveText("Найдено: 1");
  await expect(page).toHaveURL(/power=1600/);
  await page.goBack();
  await expect(foundCount(page)).toHaveText("Найдено: 2");
  await page.goForward();
  await expect(foundCount(page)).toHaveText("Найдено: 1");
  await page.reload();
  await expect(foundCount(page)).toHaveText("Найдено: 1");
  await expect(page.getByRole("link", { name: "Демо · сухой трансформатор 1600", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Сбросить все", exact: true }).click();
  await expect(foundCount(page)).toHaveText("Найдено: 9");
});

test("pagination and sorting update results without losing the catalog", async ({ page }) => {
  await page.goto("/catalog?source=demo");
  await page.getByRole("button", { name: "Следующая страница", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(catalogRows(page)).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Следующая страница", exact: true })).toBeDisabled();
  await page.getByLabel("Сортировка", { exact: true }).selectOption("power-asc");
  await expect(page).toHaveURL(/sort=power-asc/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(catalogRows(page)).toHaveCount(6);
  await expect(catalogRows(page).first().getByRole("cell").nth(2)).toHaveText("630");
  await page.getByLabel("Сортировка", { exact: true }).selectOption("power-desc");
  await expect(catalogRows(page).first().getByRole("cell").nth(2)).toHaveText("1600");
});

test("details disclose unknown specs and documents and support keyboard tabs", async ({ page }) => {
  await page.goto("/catalog/demo-001");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Demo Transformer A");
  await expect(page.getByRole("tabpanel").locator("dd")).toHaveText(["—", "—", "—", "—", "—"]);
  await page.getByRole("tab", { name: /^Документы/ }).click();
  await expect(page.getByRole("heading", { name: "Документы ещё не добавлены" })).toBeVisible();
  await expect(page.locator("a[download]")).toHaveCount(0);
  await page.getByRole("tab", { name: /^Документы/ }).press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Описание", exact: true })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Описание позиции" })).toBeVisible();
  await page.getByRole("tab", { name: "Описание", exact: true }).press("Home");
  await expect(page.getByRole("tab", { name: "Характеристики", exact: true })).toHaveAttribute("aria-selected", "true");
  await expectShell(page);
});

test("unknown product has a useful recovery route", async ({ page }) => {
  await page.goto("/catalog/unknown-product");
  await expect(page.getByRole("heading", { name: "Позиция не найдена" })).toBeVisible();
  await page.getByRole("link", { name: "Вернуться в каталог", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(foundCount(page)).toHaveText(`Найдено: ${catalogRelease.recordCount}`);
});

test("comparison deep links expose differences and handle removal", async ({ page }) => {
  await page.goto("/catalog/compare?ids=demo-001,demo-002");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Сравнение оборудования");
  await expect(page.getByRole("rowheader", { name: "Категория", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Только различия", exact: true }).check();
  await expect(page.getByRole("rowheader", { name: "Категория", exact: true })).toHaveCount(0);
  const powerRow = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Номинальная мощность", exact: true }) });
  await expect(powerRow.getByRole("cell")).toHaveText(["—", "630 кВА"]);
  await expectShell(page);
  await page.getByRole("button", { name: "Убрать DEMO-002 из сравнения", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Выберите минимум две позиции" })).toBeVisible();
});

test("comparison selection enforces four positions and supports a direct link", async ({ page }) => {
  await page.goto("/catalog?source=demo&category=transformers");
  for (const sku of ["DEMO-001", "DEMO-002", "DEMO-003", "DEMO-004"]) {
    await page.getByRole("checkbox", { name: `Сравнить ${sku}`, exact: true }).check();
  }
  await page.getByRole("checkbox", { name: "Сравнить DEMO-005", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Сравнить DEMO-005", exact: true })).not.toBeChecked();
  await expect(page.getByRole("status").filter({ hasText: "Для сравнения можно выбрать до 4 позиций" })).toBeVisible();
  await page.getByRole("link", { name: /^Сравнить \(4\)/ }).click();
  await expect(page.getByText("Выбрано: 4 из 4", { exact: true })).toBeVisible();
  await page.goto("/catalog/compare?ids=demo-001,unknown,demo-001,demo-002,demo-003,demo-004,demo-005");
  await expect(page.getByText("Выбрано: 4 из 4", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Убрать DEMO-005 из сравнения", exact: true })).toHaveCount(0);
});

test("comparison clear follows filter history and remains cleared after reload", async ({ page }) => {
  await page.goto("/catalog?source=demo&category=transformers");
  const checkbox = page.getByRole("checkbox", { name: "Сравнить DEMO-001", exact: true });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await page.getByLabel("Поиск по каталогу").fill("DEMO-001");
  await page.getByRole("button", { name: /^Найти/ }).click();
  await expect(page).toHaveURL(/q=DEMO-001/);
  await expect(checkbox).toBeChecked();
  await page.getByRole("button", { name: "Очистить", exact: true }).click();
  await expect(checkbox).not.toBeChecked();
  await expect(page).not.toHaveURL(/compare=/);
  await page.goBack();
  await expect(page).not.toHaveURL(/q=DEMO-001/);
  await expect(checkbox).toBeChecked();
  await page.goForward();
  await expect(page).toHaveURL(/q=DEMO-001/);
  await expect(checkbox).not.toBeChecked();
  await page.reload();
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await page.getByRole("button", { name: "Очистить", exact: true }).click();
  await expect(checkbox).not.toBeChecked();
});

test("local selection persists repeated adds, bounds quantities, exports and removes", async ({ page }) => {
  await page.goto("/selection");
  await expect(page.getByRole("heading", { name: "В подборке пока нет оборудования" })).toBeVisible();
  await page.goto("/catalog/demo-001");
  await page.getByRole("button", { name: "В подборку DEMO-001", exact: true }).click();
  await page.getByRole("button", { name: "В подборку DEMO-001", exact: true }).click();
  await page.getByRole("link", { name: "Открыть подборку →", exact: true }).click();
  const quantity = page.getByRole("spinbutton", { name: "Количество DEMO-001", exact: true });
  await expect(quantity).toHaveValue("2");
  await quantity.fill("0");
  await quantity.press("Tab");
  await expect(quantity).toHaveValue("1");
  await quantity.fill("10000");
  await quantity.press("Tab");
  await expect(quantity).toHaveValue("999");
  await quantity.fill("3");
  await quantity.press("Tab");
  await page.reload();
  await expect(quantity).toHaveValue("3");
  await expectShell(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Скачать список CSV/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("alageum-selection.csv");
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString("utf8");
  expect(csv).toContain('ДЕМО — не заказ');
  expect(csv).toContain('"DEMO-001";"Demo Transformer A";"3"');
  await page.getByRole("button", { name: "Удалить DEMO-001", exact: true }).click();
  await expect(page.getByRole("heading", { name: "В подборке пока нет оборудования" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "В подборке пока нет оборудования" })).toBeVisible();
});

test("malformed saved selection is ignored without crashing", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "invalid-json"), selectionKey);
  await page.goto("/selection");
  await expect(page.getByRole("heading", { name: "В подборке пока нет оборудования" })).toBeVisible();
  await expectShell(page);
});

test("blocked local storage keeps the current selection usable and explains its limit", async ({ page }) => {
  await page.addInitScript(() => {
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (this === window.localStorage) throw new DOMException("Storage blocked", "SecurityError");
      return originalGet.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage) throw new DOMException("Storage blocked", "SecurityError");
      return originalSet.call(this, key, value);
    };
  });
  await page.goto("/catalog/demo-001");
  await page.getByRole("button", { name: "В подборку DEMO-001", exact: true }).click();
  await page.getByRole("link", { name: "Открыть подборку →", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Количество DEMO-001", exact: true })).toHaveValue("1");
  await expect(page.getByRole("status").filter({ hasText: "Хранилище браузера недоступно" })).toBeVisible();
});

test("explicit API errors never silently substitute demo products", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/v1/catalog/products?*", async (route) => {
    attempts += 1;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Catalog temporarily unavailable" } }) });
  });
  await page.goto("/catalog?source=api");
  await expect(page.getByRole("alert", { name: "Ошибка каталога" })).toContainText("Сервер каталога недоступен");
  await expect(page.getByRole("link", { name: "Demo Transformer A", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect.poll(() => attempts).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole("alert", { name: "Ошибка каталога" })).toBeVisible();
  await page.getByRole("link", { name: "Справочный статический каталог", exact: true }).click();
  await expect(foundCount(page)).toHaveText(`Найдено: ${catalogRelease.recordCount}`);
});

test("shared navigation closes after Escape and a route change", async ({ page, isMobile }) => {
  // Also cover the fully hydrated public catalog before retaining the original
  // demo navigation/Escape flow below. Both desktop and mobile must fit.
  await page.goto("/catalog");
  await expectCatalogViewport(page);
  await expectReceivesPointer(isMobile
    ? page.getByRole("button", { name: "Открыть навигацию", exact: true })
    : page.locator('.site-nav-link[href="/company"]'));
  await page.goto("/catalog?source=demo");
  await expectCatalogViewport(page);
  const header = page.getByRole("banner");
  if (isMobile) {
    await header.getByRole("button", { name: "Открыть навигацию", exact: true }).click();
    await expect(header.getByRole("navigation", { name: "Мобильная навигация", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(header.getByRole("button", { name: "Открыть навигацию", exact: true })).toHaveAttribute("aria-expanded", "false");
    await header.getByRole("button", { name: "Открыть навигацию", exact: true }).click();
    await header.getByRole("navigation", { name: "Мобильная навигация", exact: true }).getByRole("link", { name: "Компания", exact: true }).click();
    await expect(page).toHaveURL(/\/company$/);
    await expect(header.getByRole("button", { name: "Открыть навигацию", exact: true })).toHaveAttribute("aria-expanded", "false");
  } else {
    const catalog = header.getByRole("navigation", { name: "Основная навигация", exact: true }).getByRole("link", { name: "Каталог", exact: true });
    await catalog.focus();
    await expect(catalog).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(catalog).toHaveAttribute("aria-expanded", "false");
    await expect(catalog).toBeFocused();
    await catalog.press("ArrowDown");
    await expect(header.locator("#site-mega-navigation").getByRole("link", { name: /^Трансформаторы/ })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/category=transformers/);
    await expect(catalog).toHaveAttribute("aria-expanded", "false");
  }
  await expectShell(page);
});

test("imported catalog distinguishes families from model and template references", async ({ page }) => {
  await page.goto("/catalog?category=protection&recordKind=family");
  await expect(foundCount(page)).toHaveText("Найдено: 6");
  await expect(catalogRows(page)).toHaveCount(6);
  await expectShell(page);
  await page.reload();
  await expect(foundCount(page)).toHaveText("Найдено: 6");
});

test("imported model shows row-specific voltage and original page links", async ({ page }) => {
  await page.goto("/catalog/cat-yatp-v001");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ЯТП-0.25-220-12У3");
  await expect(page.locator(".summary-specs")).toContainText("220 → 12 В");
  await page.getByRole("tab", { name: /^Документы/ }).click();
  await page.getByRole("tabpanel", { name: /^Документы/ }).getByRole("link", { name: "стр. 65", exact: true }).click();
  await expect(page).toHaveURL(/catalog\/source\/?\?page=65/);
  await expect(page.getByRole("img", { name: /страница 65$/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ЯТП-0.25-220-12У3");
});

test("source viewer keeps damaged labels disclosed and supports repeated navigation", async ({ page }) => {
  await page.goto("/catalog/source?page=30");
  await expect(page.getByText(/Две подписи над габаритными чертежами повреждены/)).toBeVisible();
  await page.getByRole("button", { name: "Далее →", exact: true }).click();
  await expect(page.getByLabel("Страница исходного каталога")).toHaveValue("31");
  await page.getByRole("button", { name: "← Назад", exact: true }).click();
  await expect(page.getByLabel("Страница исходного каталога")).toHaveValue("30");
  await page.getByLabel("Страница исходного каталога").selectOption("104");
  await expect(page.getByRole("button", { name: "Далее →", exact: true })).toBeDisabled();
  await expectShell(page);
});

test("comparison retains exact 12 V versus 24 V differences", async ({ page }) => {
  await page.goto("/catalog/compare?ids=cat-yatp-v001,cat-yatp-v002");
  await expect(page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Номинальное вторичное напряжение", exact: true }) })).toContainText("12 В");
  await expect(page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Номинальное вторичное напряжение", exact: true }) })).toContainText("24 В");
  await page.getByLabel("Только различия").check();
  await expect(page.getByRole("rowheader", { name: "Номинальное вторичное напряжение", exact: true })).toBeVisible();
});


test("category navigation preserves individual models and global search", async ({ page }) => {
  await page.goto("/catalog");
  await expect(foundCount(page)).toHaveText(`Найдено: ${catalogRelease.recordCount}`);
  await expect(page.getByRole("button", { name: `Все товары (${catalogRelease.recordCount})`, exact: true })).toBeVisible();
  const filters = await openFilters(page);
  await filters.getByRole("button", { name: /^Трансформаторы/ }).click();
  await expect(foundCount(page)).toHaveText("Найдено: 570");
  await filters.getByRole("button", { name: /^Масляные трансформаторы/ }).click();
  await expect(page).toHaveURL(/equipmentType=oil-transformer/);
  await expect(catalogRows(page)).toHaveCount(6);
  await page.getByRole("button", { name: `Все товары (${catalogRelease.recordCount})`, exact: true }).click();
  await expect(foundCount(page)).toHaveText(`Найдено: ${catalogRelease.recordCount}`);
  await page.getByLabel("Поиск по каталогу").fill("ЯТП-0.25-220-12У3");
  await page.getByLabel("Поиск по каталогу").press("Enter");
  await expect(page.locator('tr[data-product-id="cat-yatp-v001"]')).toBeVisible();
  await expect(foundCount(page)).toHaveText("Найдено: 1");
  await page.reload();
  await expect(foundCount(page)).toHaveText("Найдено: 1");
  await page.getByRole("button", { name: "Сбросить все", exact: true }).click();
  await expect(foundCount(page)).toHaveText(`Найдено: ${catalogRelease.recordCount}`);
  await page.goBack();
  await expect(foundCount(page)).toHaveText("Найдено: 1");
  await page.goForward();
  await expect(foundCount(page)).toHaveText(`Найдено: ${catalogRelease.recordCount}`);
  await expectShell(page);
});

test("global parameter filters keep exact variant identities", async ({ page }) => {
  await page.goto("/catalog");
  const filters = await openFilters(page);
  await filters.getByLabel("Напряжение", { exact: true }).selectOption("220 → 12 В");
  await expect(page.locator('tr[data-product-id="cat-yatp-v001"]')).toBeVisible();
  await expect(page).not.toHaveURL(/category=/);
  await page.getByRole("checkbox", { name: "Сравнить ЯТП-0.25-220-12У3", exact: true }).check();
  await page.getByRole("button", { name: "В подборку ЯТП-0.25-220-12У3", exact: true }).click();
  await page.goto("/selection");
  await expect(page.getByRole("spinbutton", { name: "Количество ЯТП-0.25-220-12У3", exact: true })).toHaveValue("1");
});

test("shared 3D is on demand and has a no-WebGL fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (/webgl/i.test(kind)) return null;
      return original.call(this, kind, ...args);
    };
  });
  await page.goto("/catalog/cat-kik");
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByText("Иллюстративная 3D-модель типа; не CAD и не чертёж конкретного исполнения", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Открыть 3D-модель", exact: true }).click();
  await expect(page.getByText(/3D недоступно в этом браузере/)).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Попробовать снова", exact: true }).click();
  await expect(page.getByText(/3D недоступно в этом браузере/)).toBeVisible();
  await expectShell(page);
});

test("source-only and unverified products now have readable SVG icons", async ({ page }) => {
  for (const id of ["cat-2ktpg-25-3150", "cat-skip", "cat-atp-2x25", "cat-vru"]) {
    await page.goto(`/catalog/${id}`);
    const icon = page.locator(`.model-type-label [data-product-icon="${id}"]`);
    await expect(icon.locator("svg")).toBeVisible();
    await expect(icon.locator("img")).toHaveCount(0);
    await expect(icon).not.toHaveAttribute("data-icon-type", "equipment");
    if (id === "cat-vru") {
      await expect(icon).toHaveAttribute("data-icon-confidence", "typical");
      await expect(icon.locator(".product-icon-approximation")).toHaveText("≈");
      await expect(page.getByText("Условная схема типа", {exact:true})).toBeVisible();
    }
    await expectShell(page);
  }
});

test("catalog rows use only shared vectors and variants carry their own icon", async ({ page }) => {
  await page.goto("/catalog?category=protection");
  const rows = catalogRows(page);
  await expect(rows).toHaveCount(6);
  await expect(rows.locator("[data-product-icon] svg")).toHaveCount(6);
  await expect(rows.locator(".product-thumb img")).toHaveCount(0);
  await page.goto("/catalog/cat-bktp-modular");
  const variants = page.locator(".variant-grid [data-product-icon]");
  await expect(variants).toHaveCount(2);
  await expect(variants.nth(0)).not.toHaveAttribute("data-icon-type", await variants.nth(1).getAttribute("data-icon-type"));
});


test("transformer source: 823 records retain exact admitted identities and exclude held duplicates", async ({ page }) => {
  expect(catalogRelease.recordCount).toBe(823);
  await page.goto("/catalog");
  await expect(foundCount(page)).toHaveText("Найдено: 823");
  await page.getByLabel("Поиск по каталогу").fill("alageum-tmg-standard-16");
  await page.getByLabel("Поиск по каталогу").press("Enter");
  await expect(page.locator('tr[data-product-id="alageum-tmg-standard-16"]')).toBeVisible();
  await expect(page.locator('tr[data-product-id="alageum-tmg-standard-16"]')).toContainText("ТМГ-16");
  await page.goto("/catalog/alageum-tmg-standard-400");
  await expect(page.getByRole("heading", { name: "Позиция не найдена" })).toBeVisible();
  await page.goto("/catalog/tmg-400");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("400");
});

test("transformer source: physical page175 stays in the2026 PDF across repeated navigation and history", async ({ page }) => {
  await page.goto("/catalog/source?source=transformers-2026&page=175");
  await expect(page.getByLabel("Исходное издание")).toHaveValue("transformers-2026");
  await expect(page.getByLabel("Страница исходного каталога")).toHaveValue("175");
  await expect(page.locator('.source-page-image img')).toHaveAttribute('src', '/catalog-source/transformers-2026/page-175.webp');
  await expectDecodedImage(page.locator('.source-page-image img'));
  await page.getByRole("button", { name: "Далее →", exact: true }).click();
  await expect(page).toHaveURL(/source=transformers-2026&page=176/);
  await expectDecodedImage(page.locator('.source-page-image img'));
  await page.goBack();
  await expect(page.getByLabel("Страница исходного каталога")).toHaveValue("175");
  await page.goForward();
  await expect(page.getByLabel("Страница исходного каталога")).toHaveValue("176");
  await page.getByLabel("Страница исходного каталога").selectOption("187");
  await expect(page.getByRole("button", { name: "Далее →", exact: true })).toBeDisabled();
  await expectDecodedImage(page.locator('.source-page-image img'));
  await page.getByLabel("Исходное издание").selectOption("substations");
  await expect(page.getByLabel("Страница исходного каталога")).toHaveValue("1");
  await expect(page.locator('.source-page-image img')).toHaveAttribute('src', '/catalog-source/page-001.webp');
  await expectDecodedImage(page.locator('.source-page-image img'));
  await expectShell(page);
});

test("transformer source: reactors preserve kVAr and document fallback without transformer geometry", async ({ page }) => {
  await page.goto("/catalog?category=reactors");
  await expect(foundCount(page)).toHaveText("Найдено: 24");
  const filters = await openFilters(page);
  await expect(filters.getByLabel("Мощность, кВА", { exact: true })).toHaveCount(0);
  const id="tr2026-family-asia-shunt-reactor-configurations";
  await page.goto(`/catalog/${id}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Шунтирующие реакторы");
  await expect(page.getByRole("button", { name: /Открыть 3D-модель/ })).toHaveCount(0);
  await expect(page.locator(`[data-product-icon="${id}"]`).first()).toHaveAttribute("data-icon-confidence", "source-only");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.locator(".catalog-configuration summary").first().click();
  await expect(page.locator(".catalog-configuration").first()).toContainText("кВАр");
  await page.getByRole("tab", { name: /^Документы/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText("187 физических страниц");
  await expect(page.getByRole("tabpanel").getByRole("link", { name: "стр. 176", exact: true })).toHaveAttribute("href", "/catalog/source?source=transformers-2026&page=176");
});

test("transformer source: exact power filter opens the admitted card and preserves its selection and source", async ({ page }) => {
  await page.goto("/catalog?category=transformers");
  const filters = await openFilters(page);
  await filters.getByLabel("Мощность, кВА", { exact: true }).selectOption("16");
  await expect(page).toHaveURL(/power=16/);
  await page.getByLabel("Поиск по каталогу").fill("alageum-tmg-standard-16");
  await page.getByLabel("Поиск по каталогу").press("Enter");
  await expect(catalogRows(page)).toHaveCount(1);
  const row = page.locator('tr[data-product-id="alageum-tmg-standard-16"]');
  await expect(row.locator("[data-product-icon]")).toHaveAttribute("data-icon-type", "tr26-corrugated-small");
  await expect(row.locator("[data-product-icon] svg")).toBeVisible();
  await page.reload();
  await expect(catalogRows(page)).toHaveCount(1);
  await expectCatalogViewport(page);
  await row.getByRole("link", { name: "ТМГ-16 (стандартный)", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ТМГ-16 (стандартный)");
  await expect(page.locator(".summary-specs")).toContainText("16");
  await expect(page.locator('[data-equipment-model="tr26-corrugated-small"]')).toHaveAttribute("data-model-status", "idle");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "В подборку ТМГ-16", exact: true }).click();
  await page.getByRole("button", { name: "В подборку ТМГ-16", exact: true }).click();
  await page.getByRole("link", { name: "Открыть подборку →", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Количество ТМГ-16", exact: true })).toHaveValue("2");
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Количество ТМГ-16", exact: true })).toHaveValue("2");
  await page.goBack();
  await page.getByRole("tab", { name: /^Документы/ }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "стр. 6", exact: true }).click();
  await expect(page).toHaveURL(/source=transformers-2026&page=6/);
  await expectDecodedImage(page.locator(".source-page-image img"));
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ТМГ-16 (стандартный)");
  await expectShell(page);
});

for (const specimen of [
  { id: "alageum-tmg-standard-16", type: "tr26-corrugated-small" },
  { id: "alageum-2026-tsl-20kv-100", type: "tr26-dry-cast-open" },
  { id: "alageum-tdn-16000-110-cu-cu-bd1c6d05", type: "tr26-hv-tdn-16" },
  { id: "tmg-400", type: "oil-transformer" },
]) {
  test(`transformer source: real WebGL renders, rotates, closes and reopens ${specimen.id}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(`/catalog/${specimen.id}`);
    const viewer = page.locator(`[data-equipment-model="${specimen.type}"]`);
    await expect(viewer).toHaveAttribute("data-model-status", "idle");
    await expect(viewer.locator(`svg[data-equipment-type="${specimen.type}"]`)).toBeVisible();
    await expect(viewer).toContainText("Иллюстративная 3D-модель типа; не CAD и не чертёж конкретного исполнения");
    await expect(page.locator("canvas")).toHaveCount(0);
    await viewer.getByRole("button", { name: "Открыть 3D-модель", exact: true }).click();
    // Deliberately fail if WebGL is unavailable. The separate forced-fallback
    // case verifies graceful degradation, but never substitutes for render QA.
    await expect(viewer).toHaveAttribute("data-model-status", "ready", { timeout: 30_000 });
    const canvas = viewer.locator("canvas");
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvas.evaluate(element => {
      const gl = element.getContext("webgl2") || element.getContext("webgl");
      return Boolean(gl && !gl.isContextLost() && gl.drawingBufferWidth > 0 && gl.drawingBufferHeight > 0);
    })).toBe(true);
    const before = await canvasEvidence(canvas, testInfo, `${specimen.id}-opened`);
    await viewer.getByRole("button", { name: "Повернуть модель влево", exact: true }).click();
    await viewer.getByRole("button", { name: "Повернуть модель влево", exact: true }).click();
    const rotated = await canvasEvidence(canvas, testInfo, `${specimen.id}-rotated`, before);
    expect(rotated.changedPixels, "Rotate must change the rendered pixels").toBeGreaterThan(before.width * before.height * 0.005);
    await canvas.press("ArrowRight");
    await canvas.press("+");
    await canvas.press("Home");
    await viewer.getByRole("button", { name: "Приблизить модель", exact: true }).click();
    await viewer.getByRole("button", { name: "Отдалить модель", exact: true }).click();
    await viewer.getByRole("button", { name: "Сброс", exact: true }).click();
    await viewer.getByRole("button", { name: "Закрыть 3D-модель", exact: true }).click();
    await expect(viewer).toHaveAttribute("data-model-status", "idle");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(viewer.getByRole("button", { name: "Открыть 3D-модель", exact: true })).toBeFocused();
    await viewer.getByRole("button", { name: "Открыть 3D-модель", exact: true }).click();
    await expect(viewer).toHaveAttribute("data-model-status", "ready");
    await canvasEvidence(canvas, testInfo, `${specimen.id}-reopened`);
    await viewer.getByRole("button", { name: "Закрыть 3D-модель", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expectShell(page);
    expect(pageErrors).toEqual([]);
  });
}

test("transformer source: shared construction survives family navigation without inventing a family model", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/catalog/alageum-tmg-standard-16");
  const type = "tr26-corrugated-small";
  const viewer = page.locator(`[data-equipment-model="${type}"]`);
  await viewer.getByRole("button", { name: "Открыть 3D-модель", exact: true }).click();
  await expect(viewer).toHaveAttribute("data-model-status", "ready", { timeout: 30_000 });
  await page.locator(".family-back-link a").click();
  await expect(page).toHaveURL(/\/catalog\/tr2026-family-tmg-standard$/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-equipment-model]")).toHaveCount(0);
  await expect(page.locator('.model-type-label [data-product-icon]')).toHaveAttribute("data-icon-confidence", "source-only");
  await expectDecodedImage(page.locator(".product-visual img"));
  const variant = page.locator('.variant-grid a[href="/catalog/alageum-tmg-standard-25"]');
  await expect(variant.locator("[data-product-icon]")).toHaveAttribute("data-icon-type", type);
  await variant.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ТМГ-25 (стандартный)");
  await expect(viewer).toHaveAttribute("data-model-status", "idle");
  await viewer.getByRole("button", { name: "Открыть 3D-модель", exact: true }).click();
  await expect(viewer).toHaveAttribute("data-model-status", "ready");
  await canvasEvidence(viewer.locator("canvas"), testInfo, "shared-construction-tmg25");
  await page.goBack();
  await expect(page).toHaveURL(/\/catalog\/tr2026-family-tmg-standard$/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.goForward();
  await expect(viewer).toHaveAttribute("data-model-status", "idle");
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("transformer source: independently approved icon-only records keep their source image and no 3D", async ({ page }) => {
  const id = "alageum-2026-relay-tr100";
  await page.goto(`/catalog/${id}`);
  await expect(page.locator(`.model-type-label [data-product-icon="${id}"]`)).toHaveAttribute("data-icon-type", "tr26-icon-temperature-relay");
  await expect(page.locator(`.model-type-label [data-product-icon="${id}"]`)).toHaveAttribute("data-icon-confidence", "source-based");
  await expect(page.locator("[data-equipment-model]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Открыть 3D-модель", exact: true })).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expectDecodedImage(page.locator(".product-visual img"));
  await page.getByRole("tab", { name: /^Документы/ }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "стр. 85", exact: true }).click();
  await expect(page).toHaveURL(/source=transformers-2026&page=85/);
  await expectDecodedImage(page.locator(".source-page-image img"));
  await page.goBack();
  await expect(page.locator("[data-equipment-model]")).toHaveCount(0);
  await expectShell(page);
});

test("transformer source: unavailable WebGL retains the separately approved icon across retries", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return /webgl/i.test(kind) ? null : original.call(this, kind, ...args);
    };
  });
  await page.goto("/catalog/alageum-tmg-standard-16");
  const viewer = page.locator('[data-equipment-model="tr26-corrugated-small"]');
  await viewer.getByRole("button", { name: "Открыть 3D-модель", exact: true }).click();
  await expect(viewer).toHaveAttribute("data-model-status", "error");
  await expect(viewer).toContainText("Выше показана отдельно проверенная иконка");
  await expect(viewer.locator('svg[data-equipment-type="tr26-corrugated-small"]')).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await viewer.getByRole("button", { name: "Попробовать снова", exact: true }).click();
  await expect(viewer).toHaveAttribute("data-model-status", "error");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.locator(".product-original-illustration summary").click();
  await expectDecodedImage(page.locator(".product-original-illustration img"));
  await expectShell(page);
});

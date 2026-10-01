import { apiFetch } from '@/lib/api/client';

// Existing API mode is explicit: never silently replace an API error with demo records.
// Until approved attribute mapping exists, raw API attributes are only shown on details.
export async function loadApiCatalog() {
  const all = [];
  let page = 1;
  for (;;) {
    const result = await apiFetch(`/catalog/products?page=${page}&page_size=100`);
    const items = result.items || [];
    all.push(...items);
    if (!items.length || all.length >= (result.total ?? all.length)) break;
    if (page >= 100) throw new Error('Каталог превышает лимит демонстрационного API-адаптера. Нужна серверная фильтрация.');
    page += 1;
  }
  return all.map(normalizeApiProduct);
}
export function normalizeApiProduct(product) {
  return { ...product, name: product.translations?.ru?.name || product.translations?.en?.name || product.slug, source: 'api', category: '', power: null, voltage: null, cooling: null, installation: null };
}

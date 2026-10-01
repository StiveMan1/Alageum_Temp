import { facetValues } from './grouping.js';

export const PAGE_SIZE = 6;
export const filterKeys = ['category', 'equipmentType', 'recordKind', 'power', 'voltage', 'cooling', 'installation', 'current', 'subtype', 'function'];
export const normalizeQuery = (value) => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('ru')
  .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ');
const compactQuery = (value) => normalizeQuery(value).replace(/[\s-]+/g, '');
const electricalUnits = new Set(['квар', 'ква', 'квт', 'кв', 'ка', 'в', 'а']);
const electricalUnitPattern = 'квар|ква|квт|кв|ка|в|а';
const hasSearchValue = (value) => value !== null && value !== undefined && !/^[\s\-\u2010-\u2015\u2212]*$/.test(String(value));
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function searchEvidence(product) {
  const evidence = [];
  const add = (value, unit = '') => {
    if (!hasSearchValue(value)) return;
    const normalizedUnit = normalizeQuery(unit);
    if (electricalUnits.has(normalizedUnit)) {
      evidence.push({ value: normalizeQuery(value), unit: normalizedUnit });
    } else if (!normalizedUnit) {
      // Mixed-unit prose is split at its explicit units; never assign the final unit to every number.
      const pattern = new RegExp(`(\\d[\\d\\s.,;:/()→+−–-]*)\\s*(${electricalUnitPattern})(?![\\p{L}\\p{N}])`, 'gu');
      for (const match of normalizeQuery(value).matchAll(pattern)) evidence.push({ value: match[1].trim(), unit: match[2] });
    }
  };
  if (hasSearchValue(product.power)) add(product.power, 'кВА');
  if (hasSearchValue(product.voltage)) add(product.voltage, product.voltageUnit ?? 'кВ');
  for (const spec of [...(product.technicalSpecs || []), ...(product.configurations || []).flatMap((configuration) => configuration.specifications || [])]) add(spec.value, spec.unit);
  for (const current of facetValues(product, 'current')) add(current);
  return evidence;
}

function hasQuantity(evidence, value, unit) {
  const number = new RegExp(`(^|[^\\d.,])${escapePattern(normalizeQuery(value))}(?![\\d.,])`, 'u');
  return evidence.some((entry) => entry.unit === unit && number.test(entry.value));
}

function matchesSearch(product, words) {
  if (!words.length) return true;
  // Full original designations keep their identity even when they include unit-like suffixes.
  if (compactQuery(words.join(' ')) === compactQuery(product.sku)) return true;
  const evidence = product.source === 'official' ? searchEvidence(product) : [];
  const haystack = normalizeQuery([
    product.id, product.name, product.sku, product.category, product.voltage, product.power,
    product.cooling, product.installation, product.subtype, product.manufacturer,
    product.familyName, product.series,
    ...(product.configurations || []).map((configuration) => configuration.designation),
    ...evidence.map((entry) => `${entry.value} ${entry.unit}`),
  ].join(' '));
  const compact = compactQuery(haystack);
  return words.every((word, index) => {
    if (product.source === 'official') {
      const attached = word.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)(${electricalUnitPattern})$`, 'u'));
      if (attached) return hasQuantity(evidence, attached[1], attached[2]);
      if (electricalUnits.has(word)) {
        const previous = words[index - 1];
        if (previous && /^\d[\d.,/()→+-]*$/.test(previous)) return hasQuantity(evidence, previous, word);
        return evidence.some((entry) => entry.unit === word);
      }
    }
    return haystack.includes(word) || compact.includes(compactQuery(word));
  });
}

export function filterProducts(products, params = {}, omit = '') {
  if (products.some((product) => product.isCatalogGroup)) return filterCatalogGroups(products, params, omit);
  const words = normalizeQuery(params.q).split(/\s+/).filter(Boolean);
  return products.filter((product) => matchesSearch(product, words) && filterKeys.every((key) => key === omit || !params[key]
    || String(product[key]) === String(params[key]) || (product.source === 'official' && facetValues(product, key).includes(String(params[key])))));
}

/** Every active condition must match the same original member; a series is emitted once. */
export function filterCatalogGroups(groups, params = {}, omit = '') {
  const words = normalizeQuery(params.q).split(/\s+/).filter(Boolean);
  return groups.flatMap((group) => {
    const members = group.members || [group];
    const matchingMembers = members.filter((member) => matchesSearch(member, words) && filterKeys.every((key) => {
      if (key === omit || !params[key]) return true;
      const value = String(params[key]);
      // The exact raw field keeps old bookmarked URLs (e.g. voltage=380/220) working.
      return String(member[key]) === value || facetValues(member, key).includes(value);
    }));
    return matchingMembers.length ? [{ ...group, matchingMemberIds: matchingMembers.map((member) => member.id) }] : [];
  });
}

export function getCatalogFacetOptions(groups, key, params = {}) {
  return getProductFacetOptions(groups, key, params);
}

/** Hierarchical navigation filters original product rows; it never collapses them into families. */
export function getProductFacetOptions(products, key, params = {}) {
  return [...new Set(filterProducts(products, params, key).flatMap((product) => facetValues(product, key)))]
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}
export function sortProducts(products, sort = 'name') {
  return [...products].sort((a, b) => {
    if (sort === 'power-asc' || sort === 'power-desc') {
      const power = (product) => {
        if (!product.isCatalogGroup) return product.power;
        const values = facetValues(product, 'power').filter((value) => /^\d+(?:[.,]\d+)?$/.test(value)).map((value) => Number(value.replace(',', '.')));
        return values.length ? Math.min(...values) : null;
      };
      const aPower = power(a);
      const bPower = power(b);
      if (aPower == null && bPower != null) return 1;
      if (bPower == null && aPower != null) return -1;
      const delta = (aPower ?? 0) - (bPower ?? 0);
      if (delta) return sort === 'power-desc' ? -delta : delta;
    }
    return a.name.localeCompare(b.name, 'ru', { numeric: true });
  });
}
export function parseComparison(value, products, max = 4) {
  const allowed = new Set(products.map((product) => product.id));
  return [...new Set(String(value || '').split(','))].filter((id) => allowed.has(id)).slice(0, max);
}
export function normalizeSelection(value, products) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(products.map((product) => product.id));
  const seen = new Set();
  return value.filter((item) => item && allowed.has(item.id) && !seen.has(item.id) && seen.add(item.id)).map((item) => ({ id: item.id, quantity: Math.min(999, Math.max(1, Math.floor(Number(item.quantity)) || 1)) }));
}
export function selectionCsv(items, products) {
  const cell = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return '\uFEFF' + [['Подборка — не заказ', 'Обозначение', 'Наименование', 'Количество'], ...items.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return [product?.source === 'official' ? 'Официальный каталог; исполнение уточняется' : 'ДЕМО — не заказ; синтетические данные', product?.sku || '', product?.name || '', item.quantity];
  })].map((row) => row.map(cell).join(';')).join('\r\n');
}

export function paginationWindow(page, count) {
 const pages = [...new Set([1, count, page - 1, page, page + 1].filter(n => n >= 1 && n <= count))].sort((a,b) => a-b);
 return pages.flatMap((n,i) => i && n - pages[i-1] > 1 ? [null,n] : [n]);
}

'use client';
import { isApiCatalog } from '@/lib/catalog/apiData';
import { LiveCatalog } from './LiveCatalog';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUrlComparison } from './useUrlComparison';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { categories, products as allProducts, demoProducts, officialProducts, valueOrDash, recordKindLabel } from '@/lib/catalog/data';
import { filterProducts, sortProducts, paginationWindow, PAGE_SIZE } from '@/lib/catalog/query';
import { loadApiCatalog } from '@/lib/catalog/source';
import { useSelection } from './SelectionProvider';
import CatalogNotice from './CatalogNotice';
import EquipmentIcon from './EquipmentIcon';
import ProductIcon from './ProductIcon';
import { equipmentTypeFor, categorySpecRows, getCatalogSpecSummary, facetValues, equipmentTypes } from '@/lib/catalog/grouping';
import { equipmentModelName } from '@/lib/catalog/models/types';

const demoFacets = [
  { key: 'power', label: 'Мощность, кВА' }, { key: 'voltage', label: 'Напряжение (единицы в значении)' },
  { key: 'cooling', label: 'Охлаждение' }, { key: 'installation', label: 'Установка' },
];

function StaticCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = Object.fromEntries(searchParams);
  const apiMode = params.source === 'api';
  const demoMode = params.source === 'demo';
  const [remote, setRemote] = useState({ items: [], status: 'loading', error: '' });
  const [retry, setRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const selection = useSelection();
  useEffect(() => {
    if (!apiMode) return;
    let active = true;
    loadApiCatalog().then((items) => { if (active) setRemote({ items, status: 'ready', error: '' }); }).catch((error) => { if (active) setRemote({ items: [], status: 'error', error: error.message }); });
    return () => { active = false; };
  }, [apiMode, retry]);
  const products = apiMode ? remote.items : demoMode ? demoProducts : officialProducts;
  const facets = demoMode || apiMode ? demoFacets : params.category ? categorySpecRows(params.category) : [...new Map(['transformers','substations','switchgear','cabinets','protection'].flatMap(categorySpecRows).map(row => [row.key,row])).values()];
  const columns = demoMode || apiMode ? demoFacets.slice(0,3) : categorySpecRows(params.category);
  const results = sortProducts(filterProducts(products, params), params.sort);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(params.page || '1', 10) || 1));
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const [selected, setSelected] = useUrlComparison(params.compare, allProducts);
  const activeFilters = ['q', 'category', 'recordKind', 'equipmentType', 'power', 'voltage', 'cooling', 'installation', 'current', 'subtype', 'function'].filter((key) => params[key]);
  function update(changes, replace = false) {
    const next = new URLSearchParams(replace ? window.location.search : searchParams);
    next.delete('page');
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    const query = next.toString();
    const href = `${pathname}${query ? `?${query}` : ''}`;
    if (replace) window.history.replaceState(null, '', href);
    else router.push(href, { scroll: false });
  }
  function toggleCompare(id) {
    if (!selected.includes(id) && selected.length >= 4) { setNotice('Для сравнения можно выбрать до 4 позиций. Уберите одну, чтобы добавить другую.'); return; }
    setNotice('');
    const next = selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id];
    setSelected(next);
    update({ compare: next.join(',') }, true);
  }
  function resetFilters() { update(Object.fromEntries(activeFilters.map((key) => [key, '']))); }
  function add(product) { selection.add(product.id); setNotice(`${product.designation || product.sku || product.name} добавлен в подборку. Это локальный список, не заказ.`); }
  return <div className="catalog-page">
    <nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true">/</span><span>Каталог</span></nav>
    <div className="catalog-heading"><div><p className="catalog-kicker">ОБОРУДОВАНИЕ / ТЕХНИЧЕСКИЙ КАТАЛОГ</p><h1>Найдите оборудование<br />по параметрам</h1></div><p>От категории до технической детали.<br />Найдите, сравните и сохраните<br className="desktop-break" /> позиции для своего проекта.</p></div>
    {!apiMode && !demoMode && <section className="catalog-group-browser" aria-label="Группы оборудования"><div className="group-browser-heading"><h2>Категории оборудования</h2><button className="text-button" aria-pressed={!params.category && !params.equipmentType} onClick={() => update({category:'',equipmentType:'',power:'',voltage:'',current:'',cooling:'',installation:'',subtype:'',function:''})}>Все товары ({officialProducts.length})</button><span>Каждая модель остаётся отдельной позицией</span></div><div className="catalog-category-grid">{categories.map(category => <button key={category.id} aria-pressed={params.category === category.id} onClick={() => update({ category:params.category === category.id ? '' : category.id, equipmentType:'', power:'', voltage:'', cooling:'', installation:'', current:'', subtype:'', function:'' })}><EquipmentIcon type={{ transformers:'oil-transformer', substations:'substation', switchgear:'switchgear', cabinets:'distribution-cabinet', protection:'protection-cabinet' }[category.id]} size={40}/><span><strong>{category.short}</strong><small>{officialProducts.filter(product => product.category === category.id).length} позиций</small></span><b aria-hidden="true">›</b></button>)}</div></section>}
    {apiMode ? <div className="catalog-notice"><span className="notice-mark">i</span><div><strong>Режим Backend API</strong><span> Данные из существующего API. Сопоставление технических полей и подборка для API-позиций ещё не согласованы.</span></div></div> : <CatalogNotice source={demoMode ? 'demo' : 'official'} />}
    <form className="catalog-search" onSubmit={(event) => { event.preventDefault(); update({ q: new FormData(event.currentTarget).get('q').trim() }); }} role="search">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.5"/></svg>
      <input key={params.q || ''} name="q" type="search" aria-label="Поиск по каталогу" defaultValue={params.q || ''} placeholder="Наименование, артикул или параметр оборудования" maxLength={200} />
      <button type="submit" className="catalog-button primary">Найти <span aria-hidden="true">→</span></button>
    </form>
    <div className="catalog-workspace">
      <button type="button" className="catalog-button filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Параметры и категории {activeFilters.length ? `(${activeFilters.length})` : ''}<span aria-hidden="true">{filtersOpen ? '−' : '+'}</span></button>
      <aside id="catalog-filters" className={`catalog-filters${filtersOpen ? ' is-open' : ''}`} aria-label="Фильтры каталога">
        <div className="filter-title"><h2>Категории</h2><span className="catalog-meta">{products.length}</span></div>
        <div className="category-options"><button className={!params.category ? 'is-active' : ''} onClick={() => update({ category: '', equipmentType:'', power: '', voltage: '', cooling: '', installation: '', current:'', subtype:'', function:'' })} aria-pressed={!params.category}>Все оборудование <span>{products.length}</span></button>
          {!apiMode && categories.map((category) => <div className="category-tree-group" key={category.id}><button aria-pressed={params.category === category.id && !params.equipmentType} className={params.category === category.id ? 'is-active' : ''} onClick={() => update({ category: category.id, equipmentType:'', power:'', voltage:'', cooling:'', installation:'', current:'', subtype:'', function:'' })}>{category.name}<span>{products.filter(product => product.category === category.id).length}</span></button>{!demoMode && params.category === category.id && <div className="category-subtypes" aria-label={`Подкатегории: ${category.name}`}>{equipmentTypes.map(type => type.id).filter(type => products.some(product => product.category === category.id && equipmentTypeFor(product) === type)).map(type => <button key={type} aria-pressed={params.equipmentType === type} className={params.equipmentType === type ? 'is-active' : ''} onClick={() => update({equipmentType:params.equipmentType === type ? '' : type})}><EquipmentIcon type={type} size={25}/><span>{equipmentTypes.find(entry => entry.id === type)?.name || equipmentModelName(type)}</span><small>{products.filter(product => product.category === category.id && equipmentTypeFor(product) === type).length}</small></button>)}</div>}</div>)}
        </div>
        {!apiMode && <><div className="filter-title parameter-title"><h2>Параметры</h2><button type="button" className="text-button" onClick={resetFilters} disabled={!activeFilters.length}>Сбросить</button></div>
          {facets.map((facet) => {
            const options = [...new Set(filterProducts(products, params, facet.key).flatMap((product) => demoMode ? [product[facet.key]] : facetValues(product, facet.key)).filter((value) => value != null))].sort((a, b) => String(a).localeCompare(String(b), 'ru', { numeric: true }));
            if (params[facet.key] && !options.some((option) => String(option) === params[facet.key])) options.push(params[facet.key]);
            return <label key={facet.key} className="catalog-field"><span id={`filter-${facet.key}-label`}>{facet.label}{!demoMode && facet.unit ? `, ${facet.unit}` : ''}</span><select aria-labelledby={`filter-${facet.key}-label`} value={params[facet.key] || ''} onChange={(event) => update({ [facet.key]: event.target.value })}><option value="">Все значения</option>{options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>;
          })}
          {!demoMode && <label className="catalog-field"><span id="filter-record-kind-label">Тип записи</span><select aria-labelledby="filter-record-kind-label" value={params.recordKind || ''} onChange={(event) => update({ recordKind: event.target.value })}><option value="">Серии и модели</option><option value="family">Только серии / семейства</option><option value="variant">Модели из таблиц</option></select></label>}<p className="filter-help">«—» означает: параметр не подтверждён.<br />Варианты напряжения уточняются по исполнению.</p></>}
        <div className="source-note"><span className="catalog-meta">ИСТОЧНИК ДАННЫХ</span><strong>{apiMode ? 'Существующий API' : demoMode ? `Демо-набор · ${demoProducts.length} позиций` : `Официальный каталог · ${officialProducts.length} позиций`}</strong><Link href={demoMode || apiMode ? '/catalog' : '/documents'}>{demoMode || apiMode ? 'Открыть публичный каталог' : 'Источники и документы'} <span aria-hidden="true">↗</span></Link></div>
      </aside>
      <section className="catalog-results" aria-label="Результаты каталога">
        <div className="results-toolbar"><div><h2>{params.category ? categories.find((entry) => entry.id === params.category)?.name || 'Результаты' : 'Все оборудование'}</h2><span className="catalog-meta" role="status">Найдено: {results.length}</span></div><label className="sort-control"><span>Сортировка</span><select aria-label="Сортировка" value={params.sort || 'name'} onChange={(event) => update({ sort: event.target.value })}><option value="name">По наименованию</option><option value="power-asc">Мощность: по возрастанию</option><option value="power-desc">Мощность: по убыванию</option></select></label></div>
        {!apiMode && !demoMode && <p className="catalog-icon-legend">Иконки передают общую форму серии. <span>≈</span> — условная схема типа без подтверждённого вида исполнения.</p>}
        {activeFilters.length > 0 && <div className="active-filters" aria-label="Активные фильтры">{activeFilters.map((key) => <button key={key} onClick={() => update({ [key]: '' })} aria-label={`Убрать фильтр ${params[key]}`}>{key === 'category' ? categories.find((entry) => entry.id === params[key])?.name || params[key] : key === 'equipmentType' ? equipmentModelName(params[key]) : params[key]} <span aria-hidden="true">×</span></button>)}<button className="reset-all" onClick={resetFilters}>Сбросить все</button></div>}
        {apiMode && remote.status === 'loading' ? <div className="catalog-empty" role="status"><h3>Загрузка из API…</h3><p>Ожидаем ответ существующего сервера каталога.</p></div> : apiMode && remote.status === 'error' ? <div className="catalog-empty" role="alert"><span className="empty-icon">!</span><h3>Не удалось загрузить каталог</h3><p>Проверьте, запущен ли backend и настроен ли NEXT_PUBLIC_API_URL. Демо-данные не подменяют ответ сервера.</p><p className="catalog-meta">{remote.error}</p><div className="inline-actions"><button className="catalog-button" onClick={() => { setRemote({ items: [], status: 'loading', error: '' }); setRetry(retry + 1); }}>Повторить</button><Link className="catalog-button primary" href="/catalog">Открыть публичный каталог</Link></div></div> : visible.length === 0 ? <div className="catalog-empty"><span className="empty-icon" aria-hidden="true">⌕</span><h3>По этим параметрам ничего не найдено</h3><p>Измените запрос или уберите часть фильтров.</p><button className="catalog-button" onClick={resetFilters}>Сбросить фильтры</button></div> : <>
          <div className="catalog-table-wrap" tabIndex={0} role="region" aria-label="Таблица оборудования, прокрутка по горизонтали"><table className="catalog-table"><thead><tr><th scope="col"><span className="sr-only">Выбор для сравнения</span></th><th scope="col">Оборудование / обозначение</th><>{columns.map(column => <th scope="col" key={column.key}>{column.label}{column.unit && <><br/><span>{column.unit}</span></>}</th>)}</><th scope="col"><span className="sr-only">Действия</span></th></tr></thead><tbody>{visible.map((product) => <tr key={product.id} data-product-id={product.id} className={selected.includes(product.id) ? 'is-selected' : ''} onClick={(event) => { if (!apiMode && !event.target.closest('a,button,input,label,select')) toggleCompare(product.id); }}><td><label className="selection-control"><input type="checkbox" aria-label={`Сравнить ${product.designation || product.sku || product.name}`} checked={selected.includes(product.id)} onChange={() => toggleCompare(product.id)} disabled={apiMode}/><span className="selection-dot" aria-hidden="true"/></label></td><td><div className="product-cell"><div className="product-thumb shared-type-icon"><ProductIcon product={product} size={56}/></div><div><Link className="product-name" href={`/catalog/${product.id}${apiMode ? '?source=api' : ''}`}>{product.name}</Link><span className="product-sku">{product.designation || product.sku || 'Обозначение не указано'}</span><span className="catalog-meta">{product.sourceRow?.variant || ''}</span><span className="product-kind">{apiMode ? 'Из API' : product.source === 'demo' ? 'Синтетический пример' : `${recordKindLabel(product)} · ${product.subtype || 'Каталог'}`}</span></div></div></td>{columns.map(column => <td className="numeric-cell" key={column.key}>{demoMode || apiMode ? valueOrDash(product[column.key], column.key === 'voltage' ? product.voltageUnit ?? 'кВ' : '') : getCatalogSpecSummary({...product, category:params.category || ''}).find(row => row.key === column.key)?.value || '—'}</td>)}<td><div className="row-actions"><button className="catalog-button compact" onClick={() => add(product)} disabled={apiMode} aria-label={`В подборку ${product.designation || product.sku || product.name}`}>В подборку <span aria-hidden="true">+</span></button><Link href={`/catalog/${product.id}${apiMode ? '?source=api' : ''}`}>Характеристики <span aria-hidden="true">↗</span></Link></div></td></tr>)}</tbody></table></div>
          <div className="catalog-pagination"><span className="catalog-meta">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, results.length)} из {results.length} позиций</span><nav aria-label="Страницы каталога"><button aria-label="Предыдущая страница" disabled={page === 1} onClick={() => update({ page: String(page - 1) })}>←</button>{paginationWindow(page, pageCount).map((number, index) => number === null ? <span className="pagination-gap" key={`gap-${index}`}>…</span> : <button key={number} aria-current={page === number ? 'page' : undefined} onClick={() => update({ page: String(number) })}>{number}</button>)}<button aria-label="Следующая страница" disabled={page === pageCount} onClick={() => update({ page: String(page + 1) })}>→</button></nav></div>
        </>}
        <p className="catalog-status" role="status" aria-live="polite">{notice}</p>
      </section>
    </div>
    {selected.length > 0 && !apiMode && <div className="comparison-tray"><div><span className="catalog-kicker">СРАВНЕНИЕ</span><strong>{selected.length} из 4 позиций</strong></div><div className="compare-skus">{selected.map((id) => <button key={id} onClick={() => toggleCompare(id)} aria-label={`Убрать ${allProducts.find((product) => product.id === id).sku} из сравнения`}>{allProducts.find((product) => product.id === id).sku} <span aria-hidden="true">×</span></button>)}</div><button className="text-button" onClick={() => update({ compare: '' }, true)}>Очистить</button>{selected.length >= 2 ? <Link className="catalog-button primary" href={`/catalog/compare?ids=${selected.join(',')}`}>Сравнить ({selected.length}) <span aria-hidden="true">→</span></Link> : <span className="compare-hint">Выберите ещё одну позицию</span>}</div>}
  </div>;
}

export default function Catalog() {
 const params = useSearchParams();
 return isApiCatalog(params) ? <LiveCatalog/> : <StaticCatalog/>;
}

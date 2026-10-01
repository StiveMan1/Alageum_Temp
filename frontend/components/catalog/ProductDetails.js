'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { productById, categoryName, specRows, valueOrDash, specUnit, recordKindLabel } from '@/lib/catalog/data';
import { getProduct } from '@/lib/api/catalog';
import { normalizeApiProduct } from '@/lib/catalog/source';
import { useSelection } from './SelectionProvider';
import CatalogNotice from './CatalogNotice';
import ProductVisual from './ProductVisual';
import ProductIcon from './ProductIcon';
import { equipmentTypeFor, getCatalogSpecSummary } from '@/lib/catalog/grouping';
import { equipmentModelName } from '@/lib/catalog/models/types';
import { ImportedSpecifications, ImportedDocuments } from './ImportedProductData';

const tabs = [{ id: 'specs', name: 'Характеристики' }, { id: 'overview', name: 'Описание' }, { id: 'documents', name: 'Документы' }];
export default function ProductDetails({ id }) {
  const params = useSearchParams();
  const apiMode = params.get('source') === 'api' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const [remote, setRemote] = useState({ product: null, status: 'loading' });
  const [tab, setTab] = useState('specs');
  const [notice, setNotice] = useState('');
  const selection = useSelection();
  useEffect(() => {
    if (!apiMode) return;
    let active = true;
    getProduct(id).then((product) => { if (active) setRemote({ product: normalizeApiProduct(product), status: 'ready' }); }).catch(() => { if (active) setRemote({ product: null, status: 'error' }); });
    return () => { active = false; };
  }, [apiMode, id]);
  const product = apiMode ? remote.product : productById(id);
  if (apiMode && remote.status === 'loading') return <div className="catalog-page" role="status">Загрузка карточки из API…</div>;
  if (!product) return <div className="catalog-page"><div className="catalog-empty"><p className="catalog-kicker">КАТАЛОГ</p><h1>{apiMode ? 'Карточка недоступна' : 'Позиция не найдена'}</h1><p>{apiMode ? 'Не удалось получить позицию из API. Проверьте подключение или вернитесь в каталог.' : 'Возможно, ссылка устарела. Выберите позицию из текущего каталога.'}</p><Link className="catalog-button primary" href={`/catalog${apiMode ? '?source=api' : ''}`}>Вернуться в каталог</Link></div></div>;
  const catalogHref = apiMode ? '/catalog?source=api' : product.source === 'demo' ? '/catalog?source=demo' : '/catalog';
  return <div className="catalog-page product-page">
    <nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span>/</span><Link href={catalogHref}>Каталог</Link><span>/</span><span>{product.sku}</span></nav>
    {!apiMode && <CatalogNotice compact source={product.source} />}
    <div className="product-overview">{!apiMode && product.source === 'official' ? <ProductVisual product={product}/> : <div className="product-visual">{product.image ? <Image src={product.image} alt={product.imageCaption || "Иллюстрация из дизайн-системы"} width={520} height={440} priority/> : <div className="product-no-image"><span aria-hidden="true">⌁</span>Изображение не предоставлено</div>}<span className="catalog-meta">{product.image ? (product.imageCaption || 'Иллюстрация · не изображение конкретной модели') : 'Медиа ожидаются от владельца каталога'}</span></div>}<div className="product-summary"><p className="catalog-kicker">{apiMode ? 'КАТАЛОГ / BACKEND API' : categoryName(product.category).toUpperCase()}</p><h1>{product.name}</h1>{!apiMode && product.source === 'official' && <p className="model-type-label"><ProductIcon product={product} size={28}/><Link href={`/catalog?category=${product.category}&equipmentType=${equipmentTypeFor(product)}`}>{equipmentModelName(equipmentTypeFor(product))}</Link></p>}<p className="product-code">Обозначение <strong>{product.sku || 'Не указан'}</strong></p>{product.source === 'official' && <p className="product-kind">{product.subtype} · {recordKindLabel(product)}</p>}<p className="product-summary-text">{apiMode ? 'Позиция из существующего каталога API. Параметры показаны без предположений о единицах и назначении.' : product.description}</p><dl className="summary-specs">{(product.source === 'official' && !apiMode ? getCatalogSpecSummary(product).slice(0,2) : specRows.slice(0,2)).map(row => <div key={row.key}><dt>{row.label}</dt><dd>{row.value ?? valueOrDash(product[row.key], specUnit(product,row))}</dd></div>)}</dl><div className="product-actions"><button className="catalog-button primary" disabled={apiMode} onClick={() => { selection.add(product.id); setNotice(`${product.sku} добавлен в подборку`); }} aria-label={`В подборку ${product.sku}`}>Добавить в подборку <span aria-hidden="true">+</span></button><Link className="catalog-button" href={apiMode ? '/catalog?source=api' : `${catalogHref}${catalogHref.includes('?') ? '&' : '?'}compare=${id}`}>К сравнению <span aria-hidden="true">↗</span></Link></div><p className="catalog-meta">{apiMode ? 'Подборка API-позиций ожидает согласования контракта данных.' : 'Сохраняется в этом браузере. Не оформляет заказ и не отправляет запрос.'}</p><p role="status" className="catalog-status">{notice} {notice && <Link href="/selection">Открыть подборку →</Link>}</p></div></div>
    <div className="product-tabs" role="tablist" aria-label="Информация о позиции">{tabs.map((item, index) => <button type="button" key={item.id} id={`tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; setTab(tabs[next].id); document.getElementById(`tab-${tabs[next].id}`)?.focus(); }}>{item.name}{item.id === 'documents' && <span>{product.sourceUrl ? 1 : 0}</span>}</button>)}</div>
    <section className="product-panel" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
      {tab === 'specs' && <><div className="section-title"><h2>Технические характеристики</h2><p>Значения приведены с единицами источника.<br />«—» означает, что значение не предоставлено.</p></div><dl className="technical-specs">{apiMode ? (product.attributes || []).map((attribute) => <div key={attribute.code}><dt>{attribute.code}</dt><dd>{typeof attribute.value === 'object' ? JSON.stringify(attribute.value) : String(attribute.value ?? '—')}</dd><span>{attribute.unit || '—'}</span></div>) : (product.source === 'official' ? [...getCatalogSpecSummary(product), {key:'manufacturer',label:'Производители серии',value:valueOrDash(product.manufacturer),unit:''}] : specRows).map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value ?? valueOrDash(product[row.key])}</dd><span>{row.value ? row.unit : product[row.key] == null ? '—' : specUnit(product, row) || '—'}</span></div>)}</dl>{product.source === 'official' && <p className="filter-help">Напряжения через / или диапазон обозначают доступные исполнения серии. Это не подтверждение переключаемости. Производители указаны для серии; завод конкретной поставки уточняется.</p>}{apiMode && !product.attributes?.length && <p>Технические параметры в API не предоставлены.</p>}<ImportedSpecifications product={product}/></>}
      {tab === 'overview' && <div className="editorial-panel"><h2>Описание позиции</h2><p>{product.description || 'Описание не предоставлено источником данных.'}</p>{product.source === 'demo' && <p>DEMO-001 повторяет артикул и имя исходной тестовой записи backend. Остальные позиции созданы только для демонстрации интерфейса. Категории и фильтры требуют согласования с владельцем каталога.</p>}</div>}
      {tab === 'documents' && (product.sourceKind === 'supplied-pdf' ? <ImportedDocuments product={product}/> : product.sourceUrl ? <div className="editorial-panel"><h2>Официальный источник характеристик</h2><p>Технические таблицы серии размещены на сайте производителя. Это HTML-страница, а не паспорт конкретного изделия.</p><a className="catalog-button" href={product.sourceUrl} target="_blank" rel="noopener noreferrer">Характеристики на официальном сайте ↗</a><p className="catalog-meta">Проверено 30.09.2026. Актуальные паспорта, чертежи и сертификаты запрашиваются для согласованного исполнения.</p><Link className="site-text-link" href="/documents">Общие каталоги и референсы →</Link></div> : <div className="document-empty"><span className="empty-icon" aria-hidden="true">↧</span><h2>Документы ещё не добавлены</h2><p>Паспорта, чертежи и сертификаты появятся после получения утверждённых файлов и правил доступа.</p><p className="catalog-meta">Тестовые ссылки на скачивание не используются.</p></div>)}
    </section>
    <div className="catalog-bottom-nav"><Link href={catalogHref}>← Вернуться к каталогу</Link><Link href="/selection">Моя подборка →</Link></div>
  </div>;
}

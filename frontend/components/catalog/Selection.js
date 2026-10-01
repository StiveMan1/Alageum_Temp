'use client';
import Link from 'next/link';
import { useState } from 'react';
import { products, productById } from '@/lib/catalog/data';
import { selectionCsv } from '@/lib/catalog/query';
import { useSelection } from './SelectionProvider';
import CatalogNotice from './CatalogNotice';
import ProductIcon from './ProductIcon';
function Quantity({ item, sku, onChange }) {
  const [draft, setDraft] = useState(String(item.quantity));
  return <input type="number" min="1" max="999" step="1" value={draft} aria-label={`Количество ${sku}`} onChange={(event) => setDraft(event.target.value)} onBlur={() => { const value = Math.min(999, Math.max(1, Math.floor(Number(draft)) || 1)); setDraft(String(value)); onChange(value); }}/>;
}
export default function Selection() {
  const selection = useSelection();
  const [notice, setNotice] = useState('');
  function download() {
    const blob = new Blob([selectionCsv(selection.items, products)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'alageum-selection.csv'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('CSV-подборка подготовлена к скачиванию. Это список для обсуждения, не заказ.');
  }
  return <div className="catalog-page"><nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/catalog">Каталог</Link><span>/</span><span>Моя подборка</span></nav><div className="catalog-heading compact-heading"><div><p className="catalog-kicker">ВАШ ПРОЕКТ / ЛОКАЛЬНЫЙ СПИСОК</p><h1>Моя подборка</h1></div><p>Сохраните выбранные позиции.<br />Список доступен в этом браузере.</p></div><CatalogNotice compact source={selection.items.some((item) => productById(item.id)?.source === 'demo') ? 'demo' : 'official'} />{selection.storageUnavailable && <p className="catalog-notice" role="status">Хранилище браузера недоступно. Подборка сохранится только до закрытия этой страницы.</p>}
    {!selection.items.length ? <div className="catalog-empty"><span className="empty-icon" aria-hidden="true">+</span><h2>В подборке пока нет оборудования</h2><p>Добавьте позиции из каталога, чтобы собрать список для обсуждения проекта.</p><div className="inline-actions"><Link className="catalog-button primary" href="/catalog">Перейти в каталог →</Link><Link className="catalog-button" href="/inquiry?intent=selection">Запросить помощь с подбором →</Link></div></div> : <><div className="selection-layout"><div className="selection-items">{selection.items.map((item) => { const product = productById(item.id); return <article className="selection-item" key={item.id}><div className="selection-product"><ProductIcon product={product} size={48}/><div><span className="product-sku">{product.sku}</span><Link className="product-name" href={`/catalog/${product.id}`}>{product.name}</Link><span className="product-kind">{product.source === 'demo' ? 'Синтетический пример' : product.source === 'official' ? 'Публичная серия; исполнение уточняется' : 'Позиция каталога'}</span></div></div><label className="quantity-label"><span>Количество, шт.</span><Quantity key={`${item.id}-${item.quantity}`} item={item} sku={product.sku} onChange={(value) => selection.setQuantity(item.id, value)}/></label><button className="remove-item" onClick={() => { selection.remove(item.id); setNotice(`${product.sku} удалён из подборки`); }} aria-label={`Удалить ${product.sku}`}>×</button></article>; })}</div><aside className="selection-summary"><p className="catalog-kicker">СОСТАВ ПОДБОРКИ</p><dl><div><dt>Позиций</dt><dd>{selection.items.length}</dd></div><div><dt>Единиц оборудования</dt><dd>{selection.count}</dd></div></dl><Link className="catalog-button primary" href="/inquiry?intent=quote">Подготовить запрос <span aria-hidden="true">→</span></Link><button className="catalog-button" style={{ marginTop: 10 }} onClick={download}>Скачать список CSV <span aria-hidden="true">↓</span></button><p>Цены и наличие не заданы. Скачивание не отправляет заявку и не оформляет заказ.</p></aside></div><div className="catalog-bottom-nav"><Link href="/catalog">← Продолжить подбор</Link><span className="catalog-meta">Количество: от 1 до 999 на позицию</span></div></>}
    <p role="status" className="catalog-status">{notice}</p>
  </div>;
}

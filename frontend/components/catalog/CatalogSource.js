'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { catalogImport, transformerImport, productById } from '@/lib/catalog/data';
import { catalogSources, defaultCatalogSourceId, sourcePageUrl, sourcePageImage } from '@/lib/catalog/sources';
const pageTypes = {cover:'Обложка',blank:'Пустая страница',overview:'Обзор',contents:'Содержание',product:'Продукция',continuation:'Характеристики / схемы',certificate:'Исторические сертификаты',notes:'Заметки',contacts:'Контакты'};
export default function CatalogSource() {
 const params=useSearchParams(),router=useRouter();
 const sourceId=params.get('source') || defaultCatalogSourceId;
 const source=catalogSources[sourceId];
 if(!source) return <div className="catalog-page"><h1>Исходное издание не найдено</h1><Link href="/catalog/source">Открыть каталог источников</Link></div>;
 const metadata=sourceId===defaultCatalogSourceId?catalogImport:transformerImport;
 const page=Math.max(1,Math.min(source.page_count,Number.parseInt(params.get('page') || '1',10)||1));
 const entry=metadata.coverage?.find(item=>item.page===page);
 const families=(entry?.families || []).map(productById).filter(Boolean);
 const image=sourcePageImage(sourceId,page);
 function go(value){router.push(sourcePageUrl(sourceId,Number(value)),{scroll:false});}
 return <div className="catalog-page catalog-source-viewer"><nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/catalog">Каталог</Link><span>/</span><span>Исходное издание</span></nav>
  <div className="catalog-heading compact-heading"><div><p className="catalog-kicker">{source.page_count} ФИЗИЧЕСКИХ СТРАНИЦ</p><h1>{source.title}</h1></div><p>{metadata.active===false?'Постраничный источник. Проверка и сверка каталожных записей продолжаются.':`${metadata.familyCount} серий и семейств. Обозначения и конфигурации сохраняются отдельно от кодов заказа.`}</p></div>
  <label>Издание <select aria-label="Исходное издание" value={sourceId} onChange={event=>router.push(sourcePageUrl(event.target.value,1),{scroll:false})}>{Object.values(catalogSources).map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
  <div className="source-viewer-toolbar"><button className="catalog-button" disabled={page===1} onClick={()=>go(page-1)}>← Назад</button><label>Страница<select aria-label="Страница исходного каталога" value={page} onChange={event=>go(event.target.value)}>{Array.from({length:source.page_count},(_,i)=>{const number=i+1;const item=metadata.coverage?.find(row=>row.page===number);return <option key={number} value={number}>{number}{item?` · ${pageTypes[item.type] || item.type}`:''}</option>;})}</select></label><button className="catalog-button" disabled={page===source.page_count} onClick={()=>go(page+1)}>Далее →</button><a href={source.source_url} target="_blank" rel="noopener noreferrer">Исходный PDF ↗</a></div>
  {metadata.unresolvedLabels?.some(item=>item.page===page) && <p className="catalog-data-warning">{metadata.unresolvedLabels.filter(item=>item.page===page).map(item=>item.reason).join(' ')}</p>}
  {families.length>0 && <div className="source-page-products">На этой странице: {families.map(item=><Link href={`/catalog/${item.id}`} key={item.id}>{item.designation || item.sku || item.name} →</Link>)}</div>}
  {sourceId===defaultCatalogSourceId && page>=99 && page<=100 && <p className="catalog-data-warning">Исторические репродукции сертификатов из издания 2024 года. Текущая действительность не подтверждена.</p>}
  <a href={image} target="_blank" rel="noopener noreferrer" className="source-page-image"><Image key={`${sourceId}-${page}`} src={image} width={1406} height={1988} alt={`${source.title}, физическая страница ${page}`} unoptimized priority/><span>Открыть страницу крупнее ↗</span></a><p className="filter-help">Номер ссылки означает физическую страницу PDF. Напечатанная нумерация может отличаться. Изображения воспроизводят источник; противоречия согласовывайте с производителем.</p>
 </div>;
}

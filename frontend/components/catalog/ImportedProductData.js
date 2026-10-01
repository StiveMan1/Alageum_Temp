import Link from 'next/link';
import { productById } from '@/lib/catalog/data';
import ProductIcon from './ProductIcon';

export function SourcePageLink({ page }) {
 return <Link href={`/catalog/source?page=${page}`} className="source-page-link">стр. {page}</Link>;
}
export function ImportedSpecifications({ product }) {
 if (product.sourceKind !== 'supplied-pdf') return null;
 const variants = (product.variantIds || []).map(productById).filter(Boolean);
 return <div className="imported-specifications">
  <div className="catalog-source-line"><span>Каталог «Шкафные конструкции», 02.09.2024</span><span>{product.sourcePages.map(page => <SourcePageLink page={page} key={page}/>)}</span></div>
  {product.familyId && <p className="family-back-link"><Link href={`/catalog/${product.familyId}`}>← Все исполнения серии {product.familyName}</Link></p>}
  {!!product.notes?.length && <details className="catalog-data-warning"><summary>Примечания и ограничения источника ({product.notes.length})</summary><ul>{product.notes.map((note,i)=><li key={i}>{note}</li>)}</ul></details>}
  <h3>Параметры из печатного каталога</h3>
  <p className="filter-help">Значения сохранены с единицами источника. Табличные варианты и диапазоны не означают подтверждённую комплектацию или готовый артикул заказа. Несогласованности исходного издания указаны в примечаниях.</p>
  <dl className="technical-specs imported-specs">{product.technicalSpecs.map((spec,i)=><div key={`${spec.label}-${i}`}><dt>{spec.label}</dt><dd>{spec.value}</dd><span>{spec.unit || '—'}<SourcePageLink page={spec.page}/></span></div>)}</dl>
  {variants.length>0 && <section className="catalog-variants"><h3>Модели и обозначения в каталоге <span>({variants.length})</span></h3><p className="filter-help">Обозначения приведены из таблиц, подписей или составлены по напечатанному шаблону; особенности указаны в примечаниях. Наличие, актуальность и код заказа уточняются.</p><div className="variant-grid">{variants.map(variant=><Link key={variant.id} href={`/catalog/${variant.id}`}><ProductIcon product={variant} size={40}/><strong>{variant.sku}</strong><span>Открыть характеристики →</span></Link>)}</div></section>}
  {!!product.configurations?.length && <section className="catalog-variants"><h3>Размеры, параметры и варианты серии <span>({product.configurations.length})</span></h3><p className="filter-help">Это строки размеров, мощностей, назначений и индексы обозначений. Они сохранены отдельно от моделей; сочетания параметров не сгенерированы.</p>{product.configurations.map((configuration,i)=><details className="catalog-configuration" key={i}><summary>{configuration.designation}<span>{configuration.kind === 'code-option' ? 'Индекс обозначения' : 'Табличный вариант'} · стр. {configuration.page}</span></summary><dl>{configuration.specifications.map((spec,j)=><div key={j}><dt>{spec.label}</dt><dd>{spec.value}{spec.unit ? ` ${spec.unit}` : ''} <SourcePageLink page={spec.page}/></dd></div>)}</dl><SourcePageLink page={configuration.page}/></details>)}</section>}
 </div>;
}
export function ImportedDocuments({ product }) {
 return <div className="editorial-panel"><h2>Страницы исходного каталога</h2><p>Издание «Шкафные конструкции» от 02.09.2024 предоставлено для этой тестовой версии. Здесь доступны изображения всех 104 страниц, включая исходные таблицы, схемы и чертежи.</p><div className="catalog-source-pages">{product.sourcePages.map(page=><SourcePageLink page={page} key={page}/>)}</div><a className="catalog-button" href={product.sourceUrl} target="_blank" rel="noopener noreferrer">Открыть исходный PDF в Google Drive ↗</a><p className="catalog-meta">Каталог не заменяет паспорт конкретного изделия. Сертификаты на страницах 99–100 являются историческими репродукциями; их текущая действительность не подтверждена.</p>{product.additionalSources?.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></p>)}<Link className="site-text-link" href="/documents">Все источники и документы →</Link></div>;
}

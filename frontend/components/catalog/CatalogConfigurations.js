import Link from 'next/link';
import { sourcePageUrl } from '@/lib/catalog/sources';
import { catalogConfigurationLabel, displaySpecLabel } from '@/lib/catalog/presentation';

function PageLink({ product, page }) {
  const href = sourcePageUrl(product, page);
  return href ? <Link className="source-page-link" href={href}>стр. {page}</Link> : <span>стр. {page}</span>;
}

export default function CatalogConfigurations({ product, configurations = product.configurations || [] }) {
  if (!configurations.length) return null;
  return <section className="catalog-variants catalog-table-configurations"><h3>Табличные строки и варианты <span>({configurations.length})</span></h3>
    <p className="filter-help">Каждая строка сохраняет напечатанные вместе параметры, размеры или индексы. Это не отдельные модели и не готовые артикулы заказа; новые сочетания параметров не созданы.</p>
    {configurations.map((configuration, index) => <details className="catalog-configuration" key={configuration.id || index} data-configuration-id={configuration.id || undefined}>
      <summary className="catalog-spec-text">{catalogConfigurationLabel(configuration, index)}<span>{configuration.kind === 'code-option' ? 'Индекс обозначения' : 'Строка таблицы'} · стр. {configuration.page}</span></summary>
      <dl>{(configuration.specifications || []).map((spec, i) => <div key={i}><dt className="catalog-spec-text">{displaySpecLabel(spec.label)}</dt><dd className="catalog-spec-text">{spec.value}{spec.unit ? ` ${spec.unit}` : ''} <PageLink product={product} page={spec.page}/></dd></div>)}</dl>
      {!!configuration.notes?.length && <ul>{configuration.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>}
      <PageLink product={product} page={configuration.page}/>
    </details>)}
  </section>;
}

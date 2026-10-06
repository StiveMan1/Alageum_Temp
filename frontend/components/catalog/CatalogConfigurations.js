import Link from 'next/link';
import { getCatalogSource, sourcePageUrl } from '@/lib/catalog/sources';
import { catalogConfigurationLabel, displaySpecLabel } from '@/lib/catalog/presentation';

function validPage(product, page) {
  const source = getCatalogSource(product);
  return Number.isInteger(page) && page > 0 && (!source || page <= source.page_count);
}
function PageLink({ product, page }) {
  if (!validPage(product, page)) return null;
  const href = sourcePageUrl(product, page);
  return href ? <Link className="source-page-link" href={href}>стр. {page}</Link> : <span>стр. {page}</span>;
}

export default function CatalogConfigurations({ product, configurations = product.configurations || [] }) {
  if (!configurations.length) return null;
  return <section className="catalog-variants catalog-table-configurations"><h3>Табличные строки и варианты <span>({configurations.length})</span></h3>
    <p className="filter-help">Каждая строка сохраняет напечатанные вместе параметры, размеры или индексы. Это не отдельные модели и не готовые артикулы заказа; новые сочетания параметров не созданы.</p>
    {configurations.map((configuration, index) => {
      const label = catalogConfigurationLabel(configuration, index);
      const designation = configuration.designation || label;
      const qualifier = label === designation ? '' : label.startsWith(`${designation} · `) ? label.slice(designation.length + 3) : label;
      return <details className="catalog-configuration" key={configuration.id || index} data-configuration-id={configuration.id || undefined}>
        <summary className="catalog-spec-text"><span className="configuration-designation">{designation}</span>{qualifier && <span className="configuration-qualifier">{qualifier}</span>}<span className="configuration-meta">{configuration.kind === 'code-option' ? 'Индекс обозначения' : 'Строка таблицы'}{validPage(product, configuration.page) ? ` · стр. ${configuration.page}` : ''}</span></summary>
        <dl>{(configuration.specifications || []).map((spec, i) => <div key={i}><dt className="catalog-spec-text">{displaySpecLabel(spec.label)}</dt><dd className="catalog-spec-text">{spec.value ?? '—'}</dd><span className="configuration-source catalog-spec-text"><span>{spec.unit || '—'}</span><PageLink product={product} page={spec.page}/></span></div>)}</dl>
        {!!configuration.notes?.length && <ul>{configuration.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>}
        <PageLink product={product} page={configuration.page}/>
      </details>;
    })}
  </section>;
}

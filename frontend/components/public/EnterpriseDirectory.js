'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { manufacturers } from '@/lib/public/content';
import { cityPoint, enterpriseCities, enterpriseContacts, enterprisesInCity, contactSource } from '@/lib/public/company';
import { kazakhstanPath } from '@/lib/public/kazakhstan-map';

export default function EnterpriseDirectory() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requestedCity = params.get('city');
  const city = enterpriseCities.some(item => item.title === requestedCity) ? requestedCity : 'all';
  const visible = enterprisesInCity(manufacturers, city);
  function selectCity(value) {
    if ((params.get('city') || 'all') === value) return;
    const next = new URLSearchParams(params.toString());
    if (value === 'all') next.delete('city'); else next.set('city', value);
    const query = next.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }
  return <>
    <section className="corp-geography" aria-label="География предприятий">
      <div className="corp-geo-sidebar"><p className="site-eyebrow">КАЗАХСТАН / ВЫБЕРИТЕ ГОРОД</p><h2>Общая энергия.<br />Разные компетенции.</h2><div className="corp-city-filter" aria-label="Город предприятия"><button type="button" aria-pressed={city === 'all'} onClick={() => selectCity('all')}>Все предприятия <span>{manufacturers.length.toString().padStart(2, '0')}</span></button>{enterpriseCities.map(item => <button type="button" aria-pressed={city === item.title} key={item.id} onClick={() => selectCity(item.title)}>{item.title}<span>{enterprisesInCity(manufacturers, item.title).length.toString().padStart(2, '0')}</span></button>)}</div></div>
      <div className="corp-map-panel"><span className="corp-map-label site-metadata">ПРОИЗВОДСТВО / ИНЖИНИРИНГ</span><div className="corp-map"><svg viewBox="0 0 820 460" aria-hidden="true" focusable="false"><defs><pattern id="geo-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="currentColor" opacity=".22" /></pattern></defs><path d={kazakhstanPath} className="corp-country-fill" /><path d={kazakhstanPath} fill="url(#geo-grid)" /></svg>{enterpriseCities.map(item => { const point = cityPoint(item); return <button key={item.id} type="button" aria-label={`Показать предприятия: ${item.title}`} aria-pressed={city === item.title} className={`corp-map-pin label-${item.labelSide}`} style={{ left: `${point.x / 820 * 100}%`, top: `${point.y / 460 * 100}%` }} onClick={() => selectCity(item.title)}><i aria-hidden="true" /><span>{item.title}</span></button>; })}<span className="corp-country-name" aria-hidden="true">КАЗАХСТАН</span></div><p className="corp-map-note">Маркеры обозначают города, а не точные адреса заводов.<br />Границы: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> · Города: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a></p></div>
    </section>
    <section className="corp-section" aria-labelledby="enterprise-results-title"><div className="corp-directory-heading"><div><p className="site-eyebrow">ПРЕДПРИЯТИЯ И КОМПЕТЕНЦИИ</p><h2 id="enterprise-results-title">{city === 'all' ? 'Знакомьтесь с группой' : city}</h2></div><p role="status" aria-live="polite">Показано предприятий: {visible.length}</p></div><div className="corp-enterprise-grid">{visible.map((item,index) => { const contact = enterpriseContacts[item.id]; return <article className="corp-enterprise-card" key={item.id}><div className="corp-enterprise-top"><span className="corp-enterprise-logo">{item.short}</span><span className="site-metadata">{contact.city}</span></div><h3><Link href={`/manufacturers/${item.id}`}>{item.title}</Link></h3><p>{item.description}</p><div className="public-tags">{item.capabilities.slice(0,2).map(tag => <span key={tag}>{tag}</span>)}</div><div className="corp-enterprise-address"><span className="site-eyebrow">АДРЕС И КОНТАКТ</span><address>{contact.city}, {contact.address}</address><span className="corp-contact-role">{contact.label}</span><a href={`tel:${contact.tel}`}>{contact.phone}{contact.extension ? ` · ${contact.extension}` : ''}</a><a href={`mailto:${contact.email}`}>{contact.email}</a></div><Link className="corp-enterprise-bottom" href={`/manufacturers/${item.id}`}><span>Профиль предприятия</span><span aria-hidden="true">↗</span></Link><span className="sr-only">Предприятие {index + 1} из {visible.length}</span></article>; })}</div></section>
    <div className="corp-directory-note"><p>Здесь представлены шесть предприятий из официальных материалов группы. Это не полный реестр юридических лиц. Перед визитом или отправкой груза уточните адрес и порядок посещения.</p><a className="site-text-link" href={contactSource} target="_blank" rel="noopener noreferrer">Официальные контакты <span aria-hidden="true">↗</span></a></div>
  </>;
}

import Image from 'next/image';
import Link from 'next/link';
import EquipmentIcon from '@/components/catalog/EquipmentIcon';
import { CorporateCTA, ProjectStages, SectionHeading } from '@/components/public/CorporateParts';
import { officialProducts } from '@/lib/catalog/data';
import { projects } from '@/lib/public/content';
import './company-pages.css';

export const metadata = { title: 'ALAGEUM Electric — энергия созидания', description: 'Электротехническое производство, инжиниринг и сервис. Предприятия ALAGEUM Electric, каталог оборудования и связь с отделом продаж.' };
const categories = [
  { id: 'transformers', title: 'Трансформаторы', text: 'Преобразование напряжения', icon: 'oil-transformer' },
  { id: 'switchgear', title: 'Распределительные устройства', text: 'Коммутация и распределение', icon: 'switchgear' },
  { id: 'substations', title: 'Подстанции', text: 'Комплектные решения', icon: 'substation' },
  { id: 'cabinets', title: 'Шкафы и щиты', text: 'Управление и защита', icon: 'control-cabinet' },
  { id: 'protection', title: 'Катодная защита', text: 'Защита и измерение', icon: 'protection-cabinet' },
];
export default function HomePage() {
  return <div className="corp-page">
    <section className="corp-home-hero site-container">
      <div className="corp-hero-copy"><p className="site-eyebrow">ЭЛЕКТРОТЕХНИЧЕСКАЯ ГРУППА / КАЗАХСТАН</p><h1>Создаём основу<br />для вашей<br /><em>энергии.</em></h1><p className="corp-lead">От инженерной идеи до работающего оборудования. Производство, проектирование и сервис предприятий Alageum Electric.</p><div className="site-actions"><Link className="site-button site-button-primary" href="/catalog">Подобрать оборудование <span aria-hidden="true">↗</span></Link><Link className="site-text-link" href="/company">О компании <span aria-hidden="true">→</span></Link></div><a className="corp-hero-scroll" href="#equipment"><span aria-hidden="true">↓</span> ОТКРОЙТЕ ВОЗМОЖНОСТИ ГРУППЫ</a></div>
      <figure className="corp-hero-image"><Image src="/company/ktz-production.webp" alt="Производственное оборудование и специалист Кентауского трансформаторного завода" width={1000} height={600} preload sizes="(max-width: 760px) 100vw, 48vw" /><div className="corp-image-corner" aria-hidden="true">AE<span>ПРОИЗВОДСТВО<br />В ДЕТАЛЯХ</span></div><figcaption><span>Кентауский трансформаторный завод</span><span>01 / ПРОИЗВОДСТВО</span></figcaption></figure>
    </section>
    <div className="site-container corp-fact-strip"><div><strong>1997</strong><span>Начало истории<br />Alageum Electric</span></div><div><strong>{categories.length.toString().padStart(2, '0')}</strong><span>Направлений<br />в каталоге</span></div><div><strong>{officialProducts.length}</strong><span>Справочных позиций<br />для подбора</span></div><Link href="/manufacturers"><span>Производство<br />и компетенции группы</span><b aria-hidden="true">↗</b></Link></div>
    <section id="equipment" className="site-container corp-section"><SectionHeading number="01" label="ОБОРУДОВАНИЕ" title={<>Точное решение.<br />С первого параметра.</>} href="/catalog" link="Весь каталог" /><div className="corp-equipment-grid">{categories.map((item, index) => <Link className="corp-equipment-card" href={`/catalog?category=${item.id}`} key={item.id}><span className="corp-card-index">0{index + 1}</span><EquipmentIcon type={item.icon} size={88} /><h3>{item.title}</h3><p>{item.text}</p><span className="corp-card-arrow" aria-hidden="true">↗</span></Link>)}</div><p className="corp-small-note">Характеристики по официальным источникам. Исполнение, стоимость и сроки поставки подтверждаются при обращении.</p></section>
    <section className="corp-cycle"><div className="site-container"><SectionHeading number="02" label="КОМПЕТЕНЦИИ ГРУППЫ" title={<>Весь путь энергии.<br />В одной группе.</>} href="/company" link="Как мы работаем" /><ProjectStages /></div></section>
    <section className="site-container corp-section corp-group-feature"><div className="corp-group-statement"><p className="site-eyebrow">03 / ПРЕДПРИЯТИЯ</p><h2>Сделано в Казахстане.<br /><span>Для задач<br />большего масштаба.</span></h2><p>Заводы трансформаторного и распределительного оборудования, инженерные и строительные предприятия. У каждого своя специализация, у группы общий фокус на энергетических проектах.</p><Link href="/manufacturers" className="site-text-link">География предприятий <span aria-hidden="true">↗</span></Link></div><div className="corp-city-links">{[['Уральск','УТЗ'],['Петропавловск','ПЭТЗ'],['Кентау','КТЗ'],['Шымкент','Asia Trafo'],['Алматы','АЭМЗ · Электромонтаж']].map(([city,names]) => <Link href={`/manufacturers?city=${encodeURIComponent(city)}`} key={city}><span>{city}<small>{names}</small></span><span aria-hidden="true">↗</span></Link>)}</div></section>
    <section className="site-container corp-section corp-project-section"><SectionHeading number="04" label="ПРОЕКТЫ И ПОСТАВКИ" title="Энергия в действии" href="/projects" link="Все проекты" /><div className="corp-project-grid">{[projects[0],projects[3]].map((project,index) => <Link className="corp-project" href={`/projects/${project.id}`} key={project.id}><div className="corp-project-top"><span className="site-metadata">{project.location}</span><span aria-hidden="true">↗</span></div><strong>{project.voltage}</strong><h3>{project.title}</h3><p>{project.label}</p><span className="corp-project-number" aria-hidden="true">0{index+1}</span></Link>)}</div></section>
    <div className="site-container"><CorporateCTA /><p className="corp-small-note corp-end-note">Тестовая версия. В каталоге сохранены источники параметров; онлайн-заказ и отправка заявки на сервер не выполняются.</p></div>
  </div>;
}

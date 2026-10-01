import Image from 'next/image';
import Link from 'next/link';
import PageIntro from '@/components/public/PageIntro';
import SourceNote from '@/components/public/SourceNote';
import { CorporateCTA, ProjectStages, SectionHeading } from '@/components/public/CorporateParts';
import { companyHistory, companySource } from '@/lib/public/company';
import '../company-pages.css';
export const metadata = { title: 'О компании', description: 'История ALAGEUM Electric с 1997 года. Электротехническое производство, проектирование, монтаж и сервис предприятий группы.' };
export default function CompanyPage() {
  return <div className="corp-page site-container site-info-page">
    <PageIntro label="О компании" title={<>Инженерная мысль.<br /><span className="corp-heading-muted">Промышленный масштаб.</span></>} description="Объединяем производство, инжиниринг и сервис, чтобы энергетические идеи становились работающими проектами." />
    <section className="corp-about-opening"><figure className="corp-about-image"><Image src="/company/aemz-engineers.webp" alt="Специалисты Алматинского электромеханического завода у электротехнического оборудования" width={951} height={367} preload sizes="(max-width: 760px) 100vw, 65vw" /><figcaption>АЛМАТИНСКИЙ ЭЛЕКТРОМЕХАНИЧЕСКИЙ ЗАВОД</figcaption></figure><div className="corp-since"><span className="site-eyebrow">ОБЩАЯ ИСТОРИЯ</span><strong>1997</strong><p>Год, с которого начинается история Alageum Electric</p><a className="site-text-link" href="#history">Этапы развития <span aria-hidden="true">↓</span></a></div></section>
    <section className="corp-section corp-editorial"><div><p className="site-eyebrow">01 / О ГРУППЕ</p><h2>Люди и точность.<br />В основе энергии.</h2></div><div><p className="corp-editorial-lead">Alageum Electric — электротехническая группа Казахстана. Предприятия работают в электроэнергетике, электромашиностроении и строительстве.</p><p>Производственные площадки выпускают трансформаторное и распределительное оборудование. Инженерные компании сопровождают проектирование, строительство, монтаж и пусконаладку.</p><p>Этот подход соединяет разные этапы проекта: от исходных требований до технического обслуживания.</p><SourceNote href={companySource} checkedAt="01.10.2026">О группе на официальном сайте</SourceNote></div></section>
    <section className="corp-mission"><span className="site-eyebrow">НАША МИССИЯ</span><h2>Инженерные решения,<br />которые помогают<br /><em>энергии работать.</em></h2><p>Предлагать потребителям инновационные и эффективные решения в электромашиностроении.</p><span className="corp-mission-line" aria-hidden="true" /></section>
    <section className="corp-section"><SectionHeading number="02" label="ЕДИНЫЙ ПОДХОД" title="От идеи до эксплуатации" /><ProjectStages /></section>
    <section id="history" className="corp-section corp-history"><SectionHeading number="03" label="ИСТОРИЯ" title={<>Развиваемся.<br />Сохраняем основу.</>} /><ol>{companyHistory.map(item => <li key={item.year}><strong>{item.year}</strong><div><h3>{item.title}</h3><p>{item.text}</p></div><a className="site-text-link" href={item.source} target="_blank" rel="noopener noreferrer" aria-label={`${item.year}: официальный источник`}>Источник <span aria-hidden="true">↗</span></a></li>)}</ol></section>
    <section className="corp-company-links"><Link href="/manufacturers"><span className="site-eyebrow">ПРОИЗВОДСТВО И ИНЖИНИРИНГ</span><h2>Познакомьтесь<br />с предприятиями</h2><span className="corp-link-end">География и специализация <b aria-hidden="true">↗</b></span></Link><Link href="/documents"><span className="site-eyebrow">МАТЕРИАЛЫ ГРУППЫ</span><h2>Больше фактов.<br />Больше деталей.</h2><span className="corp-link-end">Каталоги и документы <b aria-hidden="true">↗</b></span></Link></section>
    <CorporateCTA /><p className="corp-small-note corp-end-note">Alageum Electric — наименование группы. Производитель, продавец и сторона договора определяются отдельно для каждого проекта.</p>
  </div>;
}

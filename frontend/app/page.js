import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "ALAGEUM Electric — технический каталог", description: "Подбор оборудования по техническим параметрам. Публичный каталог, предприятия группы, проекты и подготовка запроса по оборудованию." };

const categories = [
  { number: "01", title: "Трансформаторы", description: "Преобразование напряжения", href: "/catalog?category=transformers" },
  { number: "02", title: "Распределительные устройства", description: "Коммутация и распределение", href: "/catalog?category=switchgear" },
  { number: "03", title: "Подстанции", description: "Комплектные решения", href: "/catalog?category=substations" },
  { number: "04", title: "Шкафы и щиты", description: "Управление и защита", href: "/catalog?category=cabinets" },
  { number: "05", title: "Катодная защита", description: "Защита и измерение", href: "/catalog?category=protection" },
];

export default function HomePage() {
  return (
    <>
      <section className="home-hero site-container">
        <div className="home-hero-copy">
          <p className="site-eyebrow">ALAGEUM ELECTRIC / ТЕХНИЧЕСКИЙ КАТАЛОГ</p>
          <h1>Энергия.<br />В точных<br /><span>параметрах.</span></h1>
          <p className="home-hero-intro">Оборудование для вашего проекта.<br />Характеристики, сравнение и подборка<br className="home-desktop-break" /> в едином техническом каталоге.</p>
          <div className="site-actions"><Link className="site-button site-button-primary" href="/catalog">Перейти в каталог <span aria-hidden="true">↗</span></Link><Link className="site-text-link" href="/solutions">Найти решение <span aria-hidden="true">→</span></Link></div>
          <p className="home-demo-note site-metadata"><span />Публичные источники · параметры для предварительного подбора</p>
        </div>
        <figure className="home-hero-visual"><div className="home-image-frame"><Image src="/brand/transformer.png" alt="Монохромное изображение трансформаторного оборудования из фирменного дизайн-пакета" width={290} height={587} priority sizes="(max-width: 700px) 100vw, 45vw" /></div><figcaption className="site-metadata"><span>ЭЛЕКТРОТЕХНИЧЕСКОЕ ОБОРУДОВАНИЕ</span><span>01 / 03</span></figcaption></figure>
      </section>
      <section className="home-categories site-container" aria-labelledby="home-categories-title">
        <div className="home-section-heading"><p className="site-eyebrow">01 / ОБОРУДОВАНИЕ</p><h2 id="home-categories-title">Начните с категории</h2><Link href="/catalog" className="site-text-link">Весь каталог <span aria-hidden="true">→</span></Link></div>
        <div className="home-category-grid">{categories.map((category) => <Link href={category.href} className="home-category" key={category.href}><span className="site-metadata home-category-number">{category.number}</span><h3>{category.title}</h3><p>{category.description}</p><span className="home-category-arrow" aria-hidden="true">↗</span></Link>)}</div>
      </section>
      <section className="home-workflow site-container" aria-labelledby="home-workflow-title">
        <div><p className="site-eyebrow">02 / РАБОТА С КАТАЛОГОМ</p><h2 id="home-workflow-title">От параметров<br />к вашей подборке.</h2><p className="site-body-muted">Соберите оборудование в одном месте,<br />чтобы продолжить работу над проектом.</p></div>
        <ol className="home-workflow-list"><li><span className="site-metadata">01</span><div><h3>Задайте параметры</h3><p>Выберите категорию и уточните характеристики.</p></div></li><li><span className="site-metadata">02</span><div><h3>Изучите оборудование</h3><p>Откройте карточку и сравните технические данные.</p></div></li><li><span className="site-metadata">03</span><div><h3>Подготовьте запрос</h3><p>Соберите позиции, исходные данные и список документов для обсуждения с менеджером.</p></div></li></ol>
      </section>
      <section className="site-container public-section"><div className="home-section-heading"><p className="site-eyebrow">03 / ГРУППА КОМПАНИЙ</p><h2>Оборудование. Люди. Компетенции.</h2><Link href="/company" className="site-text-link">О компании ↗</Link></div><div className="public-grid three"><Link href="/manufacturers" className="public-card"><span className="public-card-mark">01</span><h3>Предприятия</h3><p>КТЗ, Asia Trafo, АЭМЗ и другие предприятия. Направления производства и инженерной работы.</p><span className="site-text-link">Познакомиться →</span></Link><Link href="/projects" className="public-card"><span className="public-card-mark">02</span><h3>Проекты и поставки</h3><p>Подстанции и энергетические объекты. Подтверждённые факты с прямой ссылкой на источник.</p><span className="site-text-link">Посмотреть проекты →</span></Link><Link href="/documents" className="public-card"><span className="public-card-mark">03</span><h3>Документы</h3><p>Каталоги группы, референсы и технические таблицы из официальных источников.</p><span className="site-text-link">Открыть документы →</span></Link></div></section>
      <section className="site-container public-dark-section"><p className="site-eyebrow">ВАШ СЛЕДУЮЩИЙ ПРОЕКТ</p><h2>От первого параметра<br/>до разговора с менеджером.</h2><p>Подготовьте запрос на оборудование и перечень документов. Посмотрите, как может выглядеть согласование в демонстрационном кабинете.</p><div className="site-actions"><Link href="/inquiry" className="site-button site-button-primary">Подготовить запрос ↗</Link><Link href="/workspace" className="site-text-link">Посмотреть демо-кабинет →</Link></div></section>
      <aside className="home-data-note site-container"><span className="site-eyebrow">СТАТУС ДАННЫХ</span><p>Параметры собраны по официальному каталогу. Цены, наличие и исполнение уточняются у производителя. Тестовые позиции доступны отдельно и не смешиваются с публичным каталогом.</p></aside>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <Link href="/" aria-label="ALAGEUM Electric — главная"><Image src="/brand/logo-white.png" alt="ALAGEUM Electric" width={154} height={40} className="site-footer-logo" /></Link>
            <p>Технический каталог.<br />Основа для вашего следующего проекта.</p>
            <span className="site-metadata site-footer-demo">Тестовая версия сайта</span>
          </div>
          <nav aria-label="Каталог в подвале"><h2 className="site-metadata">Оборудование</h2><Link href="/catalog?category=transformers">Трансформаторы</Link><Link href="/catalog?category=switchgear">Распределительные устройства</Link><Link href="/catalog?category=substations">Подстанции</Link><Link href="/catalog">Весь каталог</Link></nav>
          <nav aria-label="Компания в подвале"><h2 className="site-metadata">Компания</h2><Link href="/company">О компании</Link><Link href="/manufacturers">Предприятия</Link><Link href="/solutions">Решения</Link><Link href="/projects">Проекты</Link><Link href="/documents">Документы</Link><Link href="/contacts">Контакты</Link></nav>
          <nav aria-label="Работа с каталогом"><h2 className="site-metadata">Ваш проект</h2><Link href="/selection">Моя подборка</Link><Link href="/inquiry">Подготовить запрос</Link><Link href="/workspace">Демо-кабинет</Link><Link href="/catalog">Подобрать оборудование</Link><p className="site-footer-disclaimer">Параметры по официальным источникам. Исполнение и комплектность требуют подтверждения</p></nav>
        </div>
        <div className="site-footer-bottom site-metadata"><span>© 2026 ALAGEUM Electric</span><Link href="/data-policy">Данные и приватность</Link><span>Точность в каждой детали</span></div>
      </div>
    </footer>
  );
}

import { Suspense } from 'react';
import PageIntro from '@/components/public/PageIntro';
import EnterpriseDirectory from '@/components/public/EnterpriseDirectory';
import { CorporateCTA } from '@/components/public/CorporateParts';
import '../company-pages.css';
export const metadata = { title: 'География предприятий', description: 'Предприятия ALAGEUM Electric в Кентау, Шымкенте, Алматы, Уральске и Петропавловске. Специализация, адреса и официальные контакты.' };
export default function ManufacturersPage() {
  return <div className="corp-page site-container site-info-page"><PageIntro label="Предприятия" eyebrow="ГЕОГРАФИЯ ГРУППЫ" title={<>Предприятия,<br /><span className="corp-heading-muted">соединённые энергией.</span></>} description="Производственные и инженерные компетенции по городам Казахстана. Выберите город, чтобы найти предприятие и его контакты." /><Suspense fallback={<p className="corp-loading" role="status">Загружаем географию предприятий…</p>}><EnterpriseDirectory /></Suspense><CorporateCTA title={<>Найдём компетенцию<br />для вашего проекта.</>} /></div>;
}

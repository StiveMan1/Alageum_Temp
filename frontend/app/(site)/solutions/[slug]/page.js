import Link from 'next/link';
import { notFound } from 'next/navigation';
import { solutions, solutionById } from '@/lib/public/solutions';
import PageIntro from '@/components/public/PageIntro';
import ProjectCTA from '@/components/public/ProjectCTA';
export const dynamicParams = false;
export function generateStaticParams() { return solutions.map((item) => ({ slug: item.id })); }
export async function generateMetadata({ params }) { const item = solutionById((await params).slug); return { title: item?.title || 'Решение', description: item?.description }; }
export default async function SolutionPage({ params }) {
 const item = solutionById((await params).slug); if (!item) notFound();
 return <div className="site-container site-info-page"><PageIntro label={item.title} parent={{ href:'/solutions', label:'Решения' }} eyebrow="ПРОЕКТНЫЙ ПОДБОР" title={item.title} description={item.description} /><section className="site-editorial-section"><div><p className="site-eyebrow">01 / ИСХОДНЫЕ ДАННЫЕ</p><h2>Что нужно<br />для проработки</h2><p className="site-body-muted">Чем точнее исходные данные, тем предметнее первый разговор с инженером.</p></div><ol className="public-checklist">{item.inputs.map((input, index) => <li key={input}><span>0{index + 1}</span>{input}</li>)}</ol></section><section className="public-section"><div className="home-section-heading"><p className="site-eyebrow">02 / ОБОРУДОВАНИЕ</p><h2>Группы для рассмотрения</h2><Link href={`/catalog?category=${item.category}`} className="site-text-link">Открыть каталог →</Link></div><div className="public-grid three">{item.equipment.map((name) => <article className="public-card" key={name}><p className="site-eyebrow">ТЕХНИЧЕСКИЙ КАТАЛОГ</p><h3>{name}</h3><p>Проверьте технические параметры выбранной серии и уточните исполнение у производителя.</p><Link href="/catalog" className="site-text-link">Перейти к подбору ↗</Link></article>)}</div></section><ProjectCTA href={`/inquiry?intent=selection&solution=${item.id}`} title="Сформируйте технический запрос" /><p className="public-source">Рекомендации по подготовке запроса составлены для этой версии сайта; они не являются готовым инженерным решением.</p></div>;
}

import Link from 'next/link';
import PageIntro from '@/components/public/PageIntro';
import ProjectCTA from '@/components/public/ProjectCTA';
import { solutions } from '@/lib/public/solutions';
export const metadata = { title: 'Решения', description: 'Подготовка технического запроса для распределительных сетей, промышленности и городской инфраструктуры.' };
export default function SolutionsPage() {
 return <div className="site-container site-info-page"><PageIntro label="Решения" title={<>Начните с задачи.<br />Придём к решению.</>} description="Определите требования проекта, изучите подходящие группы оборудования и подготовьте исходные данные для инженера." /><section className="site-solution-list" aria-label="Направления решений">{solutions.map((item) => <article className="site-solution-row" key={item.id}><span className="site-eyebrow">{item.number}</span><h2>{item.title}</h2><div><p>{item.description}</p><Link className="site-text-link" href={`/solutions/${item.id}`}>Посмотреть направление <span aria-hidden="true">↗</span></Link></div></article>)}</section><div className="public-note"><strong>Предварительный подбор</strong><p>Эти маршруты помогают подготовить техническое задание. Конкретное исполнение, совместимость и комплектность определяются проектом и подтверждаются производителем.</p></div><ProjectCTA /></div>;
}

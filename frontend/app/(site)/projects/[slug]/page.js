import { notFound } from 'next/navigation';
import PageIntro from '@/components/public/PageIntro';
import SourceNote from '@/components/public/SourceNote';
import ProjectCTA from '@/components/public/ProjectCTA';
import { projects, projectById } from '@/lib/public/content';
export const dynamicParams = false;
export function generateStaticParams(){return projects.map(item=>({slug:item.id}));}
export async function generateMetadata({params}){const item=projectById((await params).slug);return {title:item?.title || 'Проект',description:item?.description};}
export default async function ProjectPage({params}){const item=projectById((await params).slug);if(!item)notFound();return <div className="site-container site-info-page"><PageIntro label={item.title} parent={{href:'/projects',label:'Проекты'}} eyebrow={item.label} title={item.title} description={item.location}/><section className="site-editorial-section"><div><p className="site-eyebrow">ПОДТВЕРЖДЁННЫЕ СВЕДЕНИЯ</p><h2>{item.voltage}</h2></div><div className="site-editorial-copy"><p>{item.description}</p><div className="public-note"><strong>Контекст публикации</strong><p>{item.note}</p></div></div></section><SourceNote href={item.source}>{item.sourceLabel}</SourceNote><ProjectCTA/></div>;}

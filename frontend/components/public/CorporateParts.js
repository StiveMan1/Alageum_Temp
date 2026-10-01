import Link from 'next/link';
import { projectStages } from '@/lib/public/company';

export function SectionHeading({ number, label, title, href, link }) {
  return <div className="corp-section-heading"><div><p className="site-eyebrow">{number} / {label}</p><h2>{title}</h2></div>{href && <Link className="site-text-link" href={href}>{link} <span aria-hidden="true">↗</span></Link>}</div>;
}
export function ProjectStages() {
  return <ol className="corp-stages">{projectStages.map(stage => <li key={stage.number}><span className="corp-stage-number">{stage.number}</span><h3>{stage.title}</h3><p>{stage.text}</p><Link href={stage.href} aria-label={`${stage.title}: подробнее`} className="corp-stage-link"><span aria-hidden="true">↗</span></Link></li>)}</ol>;
}
export function CorporateCTA({ title = <>Большие проекты<br />начинаются с разговора.</> }) {
  return <section className="corp-cta"><div><p className="site-eyebrow">СЛЕДУЮЩИЙ ШАГ</p><h2>{title}</h2><p>Расскажите о задаче. Обсудим параметры оборудования и найдём нужное направление.</p></div><div className="corp-cta-actions"><Link className="site-button site-button-primary" href="/contacts">Связаться с менеджером <span aria-hidden="true">↗</span></Link><Link className="site-text-link" href="/inquiry">Подготовить запрос <span aria-hidden="true">→</span></Link></div></section>;
}

import Link from 'next/link';
export default function ProjectCTA({ title = 'Обсудим ваш проект', text = 'Соберите исходные данные и оборудование в один запрос. Готовый текст можно проверить и передать менеджеру.', href = '/inquiry', label = 'Подготовить запрос' }) {
 return <section className="site-page-cta"><div><p className="site-eyebrow">СЛЕДУЮЩИЙ ШАГ</p><h2>{title}</h2><p>{text}</p></div><Link className="site-button site-button-primary" href={href}>{label}<span aria-hidden="true">↗</span></Link></section>;
}

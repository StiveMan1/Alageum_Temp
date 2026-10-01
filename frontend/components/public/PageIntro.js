import Link from 'next/link';
export default function PageIntro({ label, title, description, eyebrow, parent }) {
  return <><nav aria-label="Хлебные крошки" className="site-breadcrumbs"><Link href="/">Главная</Link><span aria-hidden="true">/</span>{parent && <><Link href={parent.href}>{parent.label}</Link><span aria-hidden="true">/</span></>}<span aria-current="page">{label}</span></nav><header className="site-page-heading"><p className="site-eyebrow">ALAGEUM ELECTRIC / {eyebrow || label}</p><h1>{title}</h1><p>{description}</p></header></>;
}

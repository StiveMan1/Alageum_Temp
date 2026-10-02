import Link from 'next/link';

export default function EditorialNotFound() {
  return <section className="site-container site-info-page editorial-message">
    <p className="site-eyebrow">404</p><h1>Страница не найдена</h1>
    <p>Эта страница недоступна на выбранном языке.</p>
    <Link href="/" className="site-text-link">На главную</Link>
  </section>;
}

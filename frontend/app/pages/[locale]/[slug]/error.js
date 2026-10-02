'use client';
import Link from 'next/link';

export default function EditorialError({ reset }) {
  return <section className="site-container site-info-page editorial-message" role="alert">
    <p className="site-eyebrow">ALAGEUM ELECTRIC</p><h1>Не удалось загрузить страницу</h1>
    <p>Пожалуйста, попробуйте ещё раз.</p>
    <div className="editorial-message-actions"><button type="button" className="site-button site-button-primary" onClick={reset}>Повторить</button><Link href="/" className="site-text-link">На главную</Link></div>
  </section>;
}

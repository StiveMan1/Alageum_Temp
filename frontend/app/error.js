'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }) { return <div className="site-container site-info-page"><div className="public-error" role="alert"><p className="site-eyebrow">ВРЕМЕННАЯ ОШИБКА</p><h1>Не удалось<br />открыть страницу.</h1><p>Попробуйте ещё раз. Если ошибка повторяется, вернитесь в каталог.</p><div className="site-actions"><button className="site-button site-button-primary" onClick={reset}>Повторить →</button><Link href="/catalog" className="site-text-link">В каталог ↗</Link></div></div></div>; }

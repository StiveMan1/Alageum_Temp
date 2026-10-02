'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getQuotes } from '@/lib/api/quotes';
import { quoteDate, quoteError, quoteScope, quoteStatus } from '@/lib/quotes/model';
import QuoteAccess from './QuoteAccess';
function OwnQuotes() {
  const { profile } = useAuth(), scope = quoteScope(profile);
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0), [state, setState] = useState(null);
  const key = `${scope}:${page}:${retry}`;
  useEffect(() => {
    let active = true;
    getQuotes(page).then(data => { if (active) setState({ key, data }); }).catch(error => { if (active) setState({ key, error }); });
    return () => { active = false; };
  }, [page, key]);
  if (state?.key !== key) return <p role="status">Загрузка ваших запросов…</p>;
  if (state.error) return <div className="card"><p className="error" role="alert">{quoteError(state.error)}</p><button className="buttonSecondary" onClick={() => setRetry(value => value + 1)}>Повторить</button></div>;
  return <>
    {!state.data.items.length ? <div className="card"><p>У вас пока нет сохранённых запросов.</p><Link href="/catalog?source=api">Выбрать оборудование →</Link></div> : <div className="quote-list">{state.data.items.map(item => <article className="card" key={item.id}><div className="quote-card-heading"><h2><Link href={`/b2b/quotes/${item.id}`}>Запрос {item.id.slice(0, 8)} →</Link></h2><span className="quote-status">{quoteStatus(item.status)}</span></div><p>{quoteDate(item.created_at)} · Позиций: {item.item_count}</p>{item.comment && <p className="quote-comment">{item.comment}</p>}</article>)}</div>}
    {state.data.total > 20 && <nav className="catalog-pagination" aria-label="Страницы моих запросов"><button className="catalog-button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>← Назад</button><span>Страница {page} из {Math.ceil(state.data.total / 20)}</span><button className="catalog-button" disabled={page * 20 >= state.data.total} onClick={() => setPage(value => value + 1)}>Далее →</button></nav>}
  </>;
}
export default function QuoteList() {
  return <div className="quotes-page"><div className="quote-page-heading"><h1>Мои запросы КП</h1><Link className="button" href="/inquiry?source=api">Новый запрос</Link></div><p className="muted">Запросы вашей учётной записи в текущей организации. Статус «Сохранён» подтверждает запись в базе. Работа менеджера и отправка в CRM пока не подключены.</p><QuoteAccess><OwnQuotes /></QuoteAccess></div>;
}

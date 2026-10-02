'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getQuote } from '@/lib/api/quotes';
import { catalogPrice } from '@/lib/catalog/admin';
import { hasQuoteSnapshot, quoteDate, quoteError, quoteScope, quoteStatus, quoteTitle, UUID } from '@/lib/quotes/model';
import QuoteAccess from './QuoteAccess';
function OwnQuote({ id }) {
  const { profile } = useAuth(), scope = quoteScope(profile);
  const [retry, setRetry] = useState(0), [state, setState] = useState(null), key = `${scope}:${id}:${retry}`;
  useEffect(() => {
    let active = true;
    getQuote(id).then(data => { if (active) setState({ key, data }); }).catch(error => { if (active) setState({ key, error }); });
    return () => { active = false; };
  }, [id, key]);
  if (state?.key !== key) return <p role="status">Загрузка сохранённого запроса…</p>;
  if (state.error) return <div className="card"><h1>{state.error.status === 404 ? 'Запрос недоступен' : 'Не удалось открыть запрос'}</h1><p role="alert" className="error">{quoteError(state.error)}</p>{state.error.status !== 404 && <button className="buttonSecondary" onClick={() => setRetry(value => value + 1)}>Повторить</button>}</div>;
  const quote = state.data;
  const allSnapshots = quote.items.length > 0 && quote.items.every(hasQuoteSnapshot);
  return <><div className="quote-page-heading"><h1>Запрос {quote.id.slice(0, 8)}</h1><span className="quote-status">{quoteStatus(quote.status)}</span><Link className="buttonSecondary" href={`/b2b/quotes/${quote.id}/print`}>Версия для печати</Link></div><p className="quote-id">ID: {quote.id}</p><p>{quoteDate(quote.created_at)} · Позиций: {quote.item_count}</p><p className="card" role="status">Запрос сохранён в базе. Отправка менеджеру и CRM пока не подключена. Это не заказ и не подтверждение наличия.</p>
    {quote.comment && <section className="card"><h2>Ваше сообщение</h2><p className="quote-comment">{quote.comment}</p></section>}
    <section><h2>{allSnapshots ? 'Состав на момент сохранения' : 'Состав запроса'}</h2><p className="muted">{allSnapshots ? 'Названия, цены и версия товара зафиксированы в запросе. Изменения каталога не обновляют эту копию. Цены справочные.' : 'В этом запросе есть позиции без исторической копии товара. Для них показаны только сохранённые данные запроса. Актуальный каталог не подставляется вместо отсутствующей копии.'}</p><div className="quote-list">{quote.items.map(item => {
      const hasSnapshot = hasQuoteSnapshot(item);
      return <article className="card" key={item.id}><h3>{quoteTitle(item)}</h3>{hasSnapshot ? <p>Артикул: {item.product_snapshot.sku || '—'}</p> : <p className="muted">Для этой позиции историческая копия товара не сохранена. Название, артикул, цена и версия на дату запроса недоступны.</p>}<dl className="quote-item-facts"><div><dt>Количество</dt><dd>{item.quantity}</dd></div><div><dt>Цена из каталога</dt><dd>{hasSnapshot ? catalogPrice(item.product_snapshot) : 'Не сохранена'}</dd></div><div><dt>Версия товара</dt><dd>{hasSnapshot ? item.product_snapshot.version ?? '—' : 'Не сохранена'}</dd></div></dl></article>;
    })}</div></section>
  </>;
}
export default function QuoteDetail({ id }) {
  return <div className="quotes-page"><Link className="quote-back" href="/b2b/quotes">← Мои запросы КП</Link>{UUID.test(id) ? <QuoteAccess next={`/b2b/quotes/${id}`}><OwnQuote id={id}/></QuoteAccess> : <div className="card"><h1>Запрос недоступен</h1><p>Проверьте адрес или выберите запрос в своём списке.</p></div>}</div>;
}

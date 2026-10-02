'use client';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useApiSelection } from '@/components/catalog/ApiSelectionProvider';
import { loadApiCatalog } from '@/lib/catalog/source';
import { liveHref } from '@/lib/catalog/apiData';
import { catalogPrice } from '@/lib/catalog/admin';
import { createQuote } from '@/lib/api/quotes';
import { canReuseAttempt, QUOTE_LIMIT, quoteError, quoteScope } from '@/lib/quotes/model';
import { completeQuoteAttempt, prepareQuoteAttempt, resetQuoteDraft, saveQuoteComment, useQuoteDraft } from '@/lib/quotes/store';

export default function LiveInquiry() {
  const { profile } = useAuth();
  // A different account/organization starts an independent UI flow. The old
  // request can still finish and update its own durable attempt in the background.
  return <LiveInquiryFlow key={quoteScope(profile) || 'anonymous'} />;
}

function LiveInquiryFlow() {
  const { profile, loading, hasPermission } = useAuth(), router = useRouter(), selection = useApiSelection();
  const scope = quoteScope(profile), draft = useQuoteDraft(scope);
  const [catalog, setCatalog] = useState({ status: 'loading', items: [] });
  const [revision, setRevision] = useState(0), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const submitting = useRef(false), errorBox = useRef(null), activeFlow = useRef(null);
  useLayoutEffect(() => {
    const flow = { scope };
    activeFlow.current = flow;
    return () => { if (activeFlow.current === flow) activeFlow.current = null; };
  }, [scope]);
  useEffect(() => {
    let active = true;
    loadApiCatalog().then(items => { if (active) setCatalog({ status: 'ready', items }); })
      .catch(() => { if (active) setCatalog({ status: 'error', items: [] }); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);
  const reusable = canReuseAttempt(draft.attempt, selection.items, draft.comment);
  const completed = reusable && draft.attempt.quoteId;
  const unavailable = selection.items.filter(item => !catalog.items.some(product => product.id === item.id && product.databaseId === item.databaseId));
  function refresh() { setCatalog({ status: 'loading', items: [] }); setRevision(value => value + 1); }
  function updateComment(value) {
    setError('');
    try { saveQuoteComment(scope, value); } catch (reason) { setError(reason.message); }
  }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !scope || completed) return;
    if (selection.storageUnavailable) { setError('Разрешите хранилище браузера перед отправкой: подборка должна сохраниться при перезагрузке.'); return; }
    const flow = activeFlow.current;
    const isCurrent = () => Boolean(flow && activeFlow.current === flow && flow.scope === scope);
    if (!isCurrent()) return;
    submitting.current = true; setPending(true); setError('');
    let attempt;
    try {
      attempt = prepareQuoteAttempt(scope, selection.items);
      if (attempt.quoteId) { router.push(`/b2b/quotes/${attempt.quoteId}`); return; }
      const quote = await createQuote(attempt.payload, attempt.key);
      // If storage fills after the POST, retaining the existing key still makes
      // retry safe. Do not misreport a confirmed server success as a failure.
      try { completeQuoteAttempt(scope, attempt.key, quote.id); } catch { /* Safe replay remains possible. */ }
      // Leaving this form or changing account does not cancel a server commit.
      // Save the original attempt above, but never hijack a newer navigation.
      if (isCurrent()) router.replace(`/b2b/quotes/${quote.id}`);
    } catch (reason) { if (isCurrent()) setError(attempt ? quoteError(reason) : reason.message); }
    finally { if (isCurrent()) { submitting.current = false; setPending(false); } }
  }
  return <div className="catalog-page inquiry-page live-inquiry">
    <nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/selection?source=api">Подборка</Link><span>/</span><span>Запрос КП</span></nav>
    <div className="catalog-heading compact-heading"><div><p className="catalog-kicker">АКТУАЛЬНЫЙ КАТАЛОГ</p><h1>Запрос коммерческого предложения</h1></div><Link className="catalog-button" href="/b2b/quotes">Мои запросы →</Link></div>
    <p className="inquiry-note">Запрос сохранится в базе и будет доступен в вашем B2B кабинете. Отправка менеджеру и CRM пока не подключена. Заказ и оплата не оформляются.</p>
    {loading ? <p role="status">Проверка сессии…</p> : !profile ? <div className="card quote-login"><h2>Войдите, чтобы отправить запрос</h2><p>Состав и количество позиций сохранятся при входе. После входа проверьте подборку и добавьте сообщение.</p><Link className="button" href="/login?next=%2Finquiry%3Fsource%3Dapi">Войти и продолжить</Link></div> : <p className="catalog-meta">Организация: {profile.organization.name} · {profile.user.email}</p>}
    {selection.storageUnavailable && <p role="alert">Подборка хранится только в памяти: хранилище браузера недоступно. Не закрывайте страницу.</p>}
    {completed ? <div className="card" role="status"><h2>Запрос сохранён</h2><p>Повторная отправка этой подборки не нужна.</p><Link className="button" href={`/b2b/quotes/${completed}`}>Открыть сохранённый запрос</Link><div className="inquiry-actions"><button className="catalog-button" type="button" onClick={() => { try { resetQuoteDraft(scope); setError(''); } catch (reason) { setError(reason.message); } }}>Подготовить новый запрос с этой подборкой</button></div><p>Новая отправка создаст отдельный запрос с теми же позициями.</p>{error && <p className="inquiry-error" role="alert">{error}</p>}<p><Link href="/selection?source=api">Изменить подборку для нового запроса →</Link></p></div> : <form onSubmit={submit} aria-busy={pending}>
      <fieldset className="inquiry-section" disabled={pending}><legend><span>01</span>Проверьте оборудование</legend>
        <p>От 1 до 999 единиц каждой позиции, до {QUOTE_LIMIT} позиций в запросе. Каталожные цены справочные; наличие и условия поставки уточняются отдельно.</p>
        {catalog.status === 'loading' && <p role="status">Загрузка актуальных позиций…</p>}
        {catalog.status === 'error' && <div className="inquiry-error-summary" role="alert"><p>Не удалось загрузить актуальный каталог. Новую отправку можно выполнить после проверки позиций.</p><button className="catalog-button" type="button" onClick={refresh}>Обновить каталог</button></div>}
        {selection.items.length === 0 ? <div className="inquiry-empty"><p>В подборке пока нет оборудования.</p><Link className="catalog-button" href="/catalog?source=api">Выбрать оборудование →</Link></div> : <div className="inquiry-equipment">{selection.items.map(item => {
          const product = catalog.items.find(product => product.id === item.id && product.databaseId === item.databaseId);
          return <div className="inquiry-item" key={item.id}><div><strong>{product ? <Link href={liveHref(product.id)}>{product.name}</Link> : item.id}</strong><small>{product ? `${product.sku || 'Без артикула'} · ${catalogPrice(product)}` : !item.databaseId ? 'Старая подборка: удалите позицию и добавьте её заново из актуального каталога.' : catalog.status === 'ready' ? 'Позиция больше не опубликована. Удалите её или выберите замену.' : 'Проверяем актуальность позиции'}</small></div><label className="inquiry-quantity">Количество<input type="number" min="1" max="999" step="1" aria-label={`Количество ${product?.sku || item.id}`} value={item.quantity} onChange={event => { setError(''); selection.setQuantity(item.id, event.target.value); }}/></label><button type="button" className="remove-item" aria-label={`Удалить ${product?.sku || item.id}`} onClick={() => { setError(''); selection.remove(item.id); }}>×</button></div>;
        })}</div>}
        <div className="inquiry-actions"><Link className="catalog-button" href="/selection?source=api">Изменить подборку →</Link><button className="catalog-button" type="button" onClick={refresh}>Обновить каталог</button></div>
        {catalog.status === 'ready' && unavailable.length > 0 && !reusable && <p className="inquiry-error" role="alert">Уберите недоступные или устаревшие позиции перед отправкой. Ничего не будет исключено автоматически.</p>}
        {selection.items.length > QUOTE_LIMIT && <p className="inquiry-error" role="alert">В подборке больше {QUOTE_LIMIT} позиций. Разделите её на несколько запросов.</p>}
      </fieldset>
      {profile && <>
        <fieldset className="inquiry-section" disabled={pending || draft.corrupt || draft.storageUnavailable}><legend><span>02</span>Сообщение к запросу</legend><label className="inquiry-field">Сообщение (необязательно)<textarea maxLength={4000} value={draft.comment} onChange={event => updateComment(event.target.value)} placeholder="Требования к комплектации, сроки или вопросы по оборудованию" aria-describedby="quote-comment-help"/></label><p id="quote-comment-help" className="inquiry-help">До 4000 символов. Черновик сообщения хранится в этой вкладке для вашей учётной записи.</p></fieldset>
        {!hasPermission('quote.create') && <p role="alert">У вашей учётной записи нет разрешения на создание запросов КП.</p>}
        {draft.storageUnavailable && <p role="alert">Для безопасной отправки нужно разрешить хранилище браузера. Попытка должна сохраниться до отправки на сервер.</p>}
        {draft.corrupt && <div role="alert"><p>Черновик в этой вкладке повреждён. Сначала проверьте мои запросы: предыдущая попытка могла сохраниться.</p><button className="catalog-button" type="button" onClick={() => { try { resetQuoteDraft(scope); setError(''); } catch (reason) { setError(reason.message); } }}>Сбросить повреждённый черновик</button></div>}
        {draft.attempt && <p className="inquiry-note">Есть сохранённая попытка отправки. Повтор без изменений использует тот же номер попытки. Отправка изменённого сообщения или подборки создаст новый запрос; предыдущий мог уже сохраниться. <Link href="/b2b/quotes">Проверить мои запросы</Link></p>}
      </>}
      {error && <div ref={errorBox} tabIndex={-1} className="inquiry-error-summary" role="alert" aria-label="Ошибка запроса КП">{error}</div>}
      {profile && <div className="inquiry-submit"><button className="catalog-button primary" type="submit" disabled={pending || selection.storageUnavailable || !hasPermission('quote.create') || draft.corrupt || draft.storageUnavailable || !selection.items.length || selection.items.length > QUOTE_LIMIT || (!reusable && (catalog.status !== 'ready' || unavailable.length > 0))}>{pending ? 'Сохранение запроса…' : reusable ? 'Повторить сохранение' : 'Сохранить запрос КП'}</button><p>Подтверждение появится после ответа сервера. После сохранения откроется карточка запроса.</p></div>}
    </form>}
  </div>;
}

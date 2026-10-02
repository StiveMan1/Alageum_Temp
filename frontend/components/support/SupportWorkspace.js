"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createTicket, getTicketCategories, getTickets } from "@/lib/api/support";
import { createTicketSubmission, initialTicketSubmission, supportReadError } from "@/lib/support/model";
import styles from "./SupportWorkspace.module.css";

function useSupportResource(load, scope) {
  const { isAuthScopeCurrent } = useAuth();
  const [state, setState] = useState({ status: 'loading', items: [], error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && isAuthScopeCurrent(scope);
    load({ signal: controller.signal }).then(items => {
      if (current()) setState({ status: 'ready', items, error: null });
    }).catch(error => {
      if (current()) setState({ status: 'error', items: [], error });
    });
    return () => controller.abort();
  }, [load, scope, isAuthScopeCurrent, attempt]);
  const reload = () => {
    if (!isAuthScopeCurrent(scope) || state.status === 'loading') return;
    setState({ status: 'loading', items: [], error: null });
    setAttempt(value => value + 1);
  };
  return { ...state, reload };
}

function TicketList({ scope, refresh }) {
  const list = useSupportResource(getTickets, scope);
  return <section className={styles.list} aria-labelledby="support-list-heading" aria-busy={list.status === 'loading'} data-testid="support-list">
    <h2 id="support-list-heading">Обращения организации</h2>
    <p className="muted">Краткий список обращений вашей организации.</p>
    {list.status === 'loading' && <p role="status">Загрузка обращений…</p>}
    {list.status === 'error' && <p className="error" role="alert">{supportReadError(list.error, 'tickets')}</p>}
    {list.status === 'ready' && (list.items.length ? <div className="grid">
      {list.items.map(item => <article className="card" key={item.id} data-testid="support-ticket-summary">
        <h3>{item.subject}</h3><p>{item.category}</p><span className="muted">{item.status}</span>
      </article>)}
    </div> : <p className="card muted" role="status">Обращений пока нет.</p>)}
    <button className="buttonSecondary" type="button" onClick={refresh} disabled={list.status === 'loading'}>Обновить список обращений</button>
  </section>;
}

function TicketForm({ scope, readable, onConfirmed }) {
  const { isAuthScopeCurrent, registerOrganizationChange } = useAuth();
  const categories = useSupportResource(getTicketCategories, scope);
  const [state, setState] = useState(initialTicketSubmission);
  const form = useRef(null), submission = useRef(null), errorBox = useRef(null);
  const hasDraft = () => ['category_id', 'subject', 'message'].some(key => Boolean(form.current?.elements.namedItem(key)?.value));
  useLayoutEffect(() => {
    const flow = createTicketSubmission({
      save: createTicket, isCurrent: () => isAuthScopeCurrent(scope), onChange: setState,
      onConfirmed: () => { form.current?.reset(); onConfirmed(); },
    });
    submission.current = flow;
    const unregister = registerOrganizationChange(() => ({ dirty: hasDraft(), pending: flow.isPending() }));
    const beforeUnload = event => {
      if (!hasDraft() && !flow.isPending()) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      flow.dispose(); unregister(); window.removeEventListener('beforeunload', beforeUnload);
      if (submission.current === flow) submission.current = null;
    };
  }, [scope, isAuthScopeCurrent, registerOrganizationChange, onConfirmed]);
  useEffect(() => { if (state.error) errorBox.current?.focus(); }, [state.error]);

  const ready = categories.status === 'ready' && categories.items.length > 0;
  const disabled = state.pending || state.uncertain;
  function submit(event) {
    event.preventDefault();
    if (!ready) return;
    const values = new FormData(event.currentTarget);
    submission.current?.submit(Object.fromEntries(['category_id', 'subject', 'message'].map(key => [key, values.get(key)])), categories.items);
  }
  function clearDraft(startNew = false) {
    if (!(startNew ? submission.current?.startNew() : submission.current?.cancel())) return;
    form.current?.reset();
    form.current?.elements.namedItem('category_id')?.focus();
  }
  return <section className={`card ${styles.create}`} aria-labelledby="support-create-heading" data-testid="support-create">
    <h2 id="support-create-heading">Новое обращение</h2>
    {!readable && <p className="muted">Вы можете создавать обращения. Просмотр списка обращений недоступен вашей учётной записи.</p>}
    {categories.status === 'loading' && <p role="status">Загрузка категорий…</p>}
    {categories.status === 'error' && <p className="error" role="alert">{supportReadError(categories.error, 'categories')}</p>}
    {categories.status === 'ready' && !categories.items.length && <p role="status">Нет доступных категорий. Создание обращения пока недоступно.</p>}
    {categories.status !== 'loading' && !ready && <button className="buttonSecondary" type="button" onClick={categories.reload} disabled={disabled}>Повторить загрузку категорий</button>}
    <form ref={form} className={`form ${styles.form}`} noValidate onSubmit={submit} aria-label="Новое обращение" aria-busy={state.pending}>
      <label>Категория<select name="category_id" required defaultValue="" disabled={!ready || disabled} aria-invalid={Boolean(state.errors.category_id)} aria-describedby={state.errors.category_id ? 'support-category-error' : undefined}>
        <option value="" disabled>Выберите категорию</option>
        {categories.items.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
      </select></label>
      {state.errors.category_id && <p className="error" id="support-category-error">{state.errors.category_id}</p>}
      <label>Тема<input name="subject" required disabled={disabled} aria-invalid={Boolean(state.errors.subject)} aria-describedby={`support-subject-help${state.errors.subject ? ' support-subject-error' : ''}`} /></label>
      <p className="muted" id="support-subject-help">До 300 символов</p>
      {state.errors.subject && <p className="error" id="support-subject-error">{state.errors.subject}</p>}
      <label>Сообщение<textarea name="message" rows={6} required disabled={disabled} aria-invalid={Boolean(state.errors.message)} aria-describedby={`support-message-help${state.errors.message ? ' support-message-error' : ''}`} /></label>
      <p className="muted" id="support-message-help">До 10000 символов. Черновик хранится только на этой странице.</p>
      {state.errors.message && <p className="error" id="support-message-error">{state.errors.message}</p>}
      <div className={styles.actions}>
        <button className="button" type="submit" disabled={!ready || disabled}>{state.pending ? 'Отправка…' : 'Создать обращение'}</button>
        {!state.uncertain && <button className="buttonSecondary" type="button" onClick={() => clearDraft()}>{state.pending ? 'Прервать ожидание' : 'Отмена'}</button>}
      </div>
      {state.pending && <p role="status">Ожидаем подтверждение сервера. Прерывание ожидания не отменяет создание обращения.</p>}
      {state.error && <p className="error" role="alert" ref={errorBox} tabIndex={-1}>{state.error}</p>}
      {state.message && <p role="status">{state.message}</p>}
      {state.uncertain && <button className="buttonSecondary" type="button" onClick={() => clearDraft(true)}>Очистить форму для нового обращения</button>}
    </form>
  </section>;
}

export default function SupportWorkspace({ scope, readable, creatable }) {
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  return <div className={styles.workspace}>
    {creatable ? <TicketForm scope={scope} readable={readable} onConfirmed={refresh} /> : <p className="muted">У вас есть доступ только к просмотру обращений.</p>}
    {readable && <TicketList key={revision} scope={scope} refresh={refresh} />}
  </div>;
}

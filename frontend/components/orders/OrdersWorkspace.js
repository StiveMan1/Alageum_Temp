"use client";

import Link from 'next/link';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getOrder, getOrders } from '@/lib/api/orders';
import { createOrderRead, initialOrderRead, orderReadError } from '@/lib/orders/read';
import styles from './OrdersWorkspace.module.css';

function useOrderRead(load, scope) {
  const { isAuthScopeCurrent } = useAuth();
  const [state, setState] = useState(initialOrderRead);
  const reader = useRef(null);
  useLayoutEffect(() => {
    const flow = createOrderRead({ load, isCurrent: () => isAuthScopeCurrent(scope), onChange: setState });
    reader.current = flow;
    // Also clear a restored Back/Forward view before paint. Its old successful
    // response or error cannot stand in for a fresh, authorized read.
    flow.reload();
    return () => { flow.dispose(); if (reader.current === flow) reader.current = null; };
  }, [load, scope, isAuthScopeCurrent]);
  return { ...state, reload: () => reader.current?.reload() };
}

function ReadState({ state }) {
  if (state.status === 'loading') return <p role="status">Загрузка заказов…</p>;
  if (state.status === 'error') return <div className="card">
    <p className="error" role="alert">{orderReadError(state.error)}</p>
    <button className="buttonSecondary" type="button" onClick={state.reload}>Повторить</button>
  </div>;
  return null;
}

export function OrderList({ scope }) {
  const state = useOrderRead(getOrders, scope);
  return <section className={styles.workspace} data-testid="orders-list" aria-label="Заказы организации" aria-busy={state.status === 'loading'}>
    <ReadState state={state} />
    {state.status === 'ready' && (state.value.length ? <div className="grid">
      {state.value.map(item => <Link className="card" href={`/b2b/orders/${item.id}`} key={item.id} data-testid="order-summary">
        <h3>{item.number}</h3><p>{item.amount} {item.currency}</p><span className="muted">{item.status}</span>
      </Link>)}
    </div> : <p className="card muted" role="status">Данных пока нет</p>)}
  </section>;
}

export function OrderDetail({ id, scope }) {
  const load = useCallback(options => getOrder(id, options), [id]);
  const state = useOrderRead(load, scope);
  const item = state.value;
  return <section className={styles.workspace} data-testid="order-detail" aria-label="Сведения о заказе" aria-busy={state.status === 'loading'}>
    <Link className="buttonSecondary" href="/b2b/orders">К списку заказов</Link>
    <ReadState state={state} />
    {state.status === 'ready' && <>
      <h1>Заказ {item.number}</h1>
      <div className="card"><p>Статус: {item.status}</p><p>Сумма: {item.amount} {item.currency}</p></div>
      <h2>Позиции</h2>
      {item.items.length ? item.items.map(line => <div className="card" key={line.id} data-testid="order-item">{line.description} — {line.quantity}</div>) : <p className="card muted" role="status">В заказе пока нет позиций.</p>}
    </>}
  </section>;
}

export default function OrdersAccess({ id }) {
  const { loading, authScope, hasPermission } = useAuth();
  if (loading) return <p role="status">Проверка доступа…</p>;
  if (!hasPermission('order.read')) return <section className="card"><p role="alert">У вашей учётной записи нет доступа к заказам.</p></section>;
  return id === undefined ? <OrderList key={authScope} scope={authScope} /> : <OrderDetail key={`${authScope}:${id}`} id={id} scope={authScope} />;
}

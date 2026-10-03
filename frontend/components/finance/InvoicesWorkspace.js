"use client";

import { useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getInvoices } from '@/lib/api/finance';
import { createInvoiceRead, initialInvoiceRead, invoiceReadError } from '@/lib/finance/read';
import styles from './InvoicesWorkspace.module.css';

function InvoiceList({ scope }) {
  const { isAuthScopeCurrent } = useAuth();
  const [state, setState] = useState(initialInvoiceRead);
  const reader = useRef(null);
  useLayoutEffect(() => {
    const flow = createInvoiceRead({ load: getInvoices, isCurrent: () => isAuthScopeCurrent(scope), onChange: setState });
    reader.current = flow;
    // Clear a restored Back/Forward view before paint and recheck its scope.
    flow.reload();
    return () => { flow.dispose(); if (reader.current === flow) reader.current = null; };
  }, [scope, isAuthScopeCurrent]);

  return <section className={styles.workspace} data-testid="invoices-list" aria-label="Счета организации" aria-busy={state.status === 'loading'}>
    {state.status === 'loading' && <p role="status">Загрузка счетов…</p>}
    {state.status === 'error' && <div className="card">
      <p className="error" role="alert">{invoiceReadError(state.error)}</p>
      <button className="buttonSecondary" type="button" onClick={() => reader.current?.reload()}>Повторить</button>
    </div>}
    {state.status === 'ready' && (state.value.length ? <div className="grid">
      {state.value.map(item => <div className="card" key={item.id} data-testid="invoice-summary">
        <h3>{item.number}</h3><p>{item.amount} {item.currency}</p><span className="muted">{item.status}</span>
      </div>)}
    </div> : <p className="card muted" role="status">Данных пока нет</p>)}
  </section>;
}

export default function InvoicesAccess() {
  const { loading, authScope, hasPermission } = useAuth();
  if (loading) return <p role="status">Проверка доступа…</p>;
  if (!hasPermission('finance.read')) return <section className="card"><p role="alert">У вашей учётной записи нет доступа к счетам.</p></section>;
  return <InvoiceList key={authScope} scope={authScope} />;
}

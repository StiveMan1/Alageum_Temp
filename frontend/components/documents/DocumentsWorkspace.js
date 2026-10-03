"use client";

import { useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getDocuments } from '@/lib/api/documents';
import { createDocumentRead, initialDocumentRead, documentReadError } from '@/lib/documents/read';
import styles from './DocumentsWorkspace.module.css';

function DocumentList({ scope }) {
  const { isAuthScopeCurrent } = useAuth();
  const [state, setState] = useState(initialDocumentRead);
  const reader = useRef(null);
  useLayoutEffect(() => {
    const flow = createDocumentRead({ load: getDocuments, isCurrent: () => isAuthScopeCurrent(scope), onChange: setState });
    reader.current = flow;
    // Clear a restored Back/Forward view before paint and recheck its scope.
    flow.reload();
    return () => { flow.dispose(); if (reader.current === flow) reader.current = null; };
  }, [scope, isAuthScopeCurrent]);

  return <section className={styles.workspace} data-testid="documents-list" aria-label="Документы организации" aria-busy={state.status === 'loading'}>
    {state.status === 'loading' && <p role="status">Загрузка документов…</p>}
    {state.status === 'error' && <div className="card">
      <p className="error" role="alert">{documentReadError(state.error)}</p>
      <button className="buttonSecondary" type="button" onClick={() => reader.current?.reload()}>Повторить</button>
    </div>}
    {state.status === 'ready' && (state.value.length ? <div className="grid">
      {state.value.map(item => <div className="card" key={item.id} data-testid="document-summary">
        <h3>{item.title}</h3><p>{item.number || "Без номера"}</p><span className="muted">{item.type_code}</span>
      </div>)}
    </div> : <p className="card muted" role="status">Данных пока нет</p>)}
  </section>;
}

export default function DocumentsAccess() {
  const { loading, authScope, hasPermission } = useAuth();
  if (loading) return <p role="status">Проверка доступа…</p>;
  if (!hasPermission('document.read')) return <section className="card"><p role="alert">У вашей учётной записи нет доступа к документам.</p></section>;
  return <DocumentList key={authScope} scope={authScope} />;
}

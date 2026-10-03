'use client';

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getOrganizationMembers } from '@/lib/api/members';
import { createMembersRead, initialMembersRead, membersHref, membersPage, membersReadError, rawMembersQuery, subscribeMembersLocation, MEMBERS_MAX_PAGE, MEMBERS_PAGE_SIZE } from '@/lib/organizations/members';
import styles from './MembersWorkspace.module.css';

function goToPage(page) {
  const href = membersHref(page);
  if (href) {
    window.history.pushState(null, '', href);
    window.dispatchEvent(new Event('alageum:members-location'));
  }
}

function MembersList({ scope, page }) {
  const { isAuthScopeCurrent } = useAuth();
  const [state, setState] = useState(initialMembersRead);
  const reader = useRef(null);
  useLayoutEffect(() => {
    const flow = createMembersRead({ load: options => getOrganizationMembers(page, options), isCurrent: () => isAuthScopeCurrent(scope), onChange: setState });
    reader.current = flow;
    // Clear restored history state before paint; Strict Mode can discard its
    // first setup before any request starts.
    Promise.resolve().then(() => flow.reload());
    const restored = event => {
      if (!event.persisted) return;
      // Another full document may have changed this tab's sessionStorage while
      // this document was frozen. Hide its old data even when reload's captured
      // scope is already invalid, then resynchronize the existing auth boundary.
      setState(initialMembersRead());
      window.dispatchEvent(new Event('alageum:session-changed'));
      flow.reload();
    };
    window.addEventListener('pageshow', restored);
    return () => { flow.dispose(); window.removeEventListener('pageshow', restored); if (reader.current === flow) reader.current = null; };
  }, [page, scope, isAuthScopeCurrent]);
  const value = state.value;
  const pageCount = value ? Math.max(1, Math.ceil(value.total / MEMBERS_PAGE_SIZE)) : null;
  return <section className={styles.workspace} aria-label="Участники организации" data-testid="members-list" aria-busy={state.status === 'loading'}>
    <p className="muted" id="members-status-help">В списке могут быть неактивные участники. Статус активности здесь не показан.</p>
    {state.status === 'loading' && <p role="status">Загрузка участников…</p>}
    {state.status === 'error' && <div className="card">
      <p className="error" role="alert">{membersReadError(state.error)}</p>
      <button className="buttonSecondary" type="button" onClick={() => reader.current?.reload()}>Повторить</button>
    </div>}
    {state.status === 'ready' && <>
      <p data-testid="members-total" role="status">Всего участников: {value.total}</p>
      {value.items.length ? <ul className={styles.list} aria-describedby="members-status-help">
        {value.items.map(item => <li className={`card ${styles.member}`} key={item.membership_id} data-testid="member-row">
          <dl>
            <div><dt>Имя</dt><dd data-testid="member-name">{item.display_name}</dd></div>
            <div><dt>Email</dt><dd data-testid="member-email">{item.email}</dd></div>
            <div><dt>Роль</dt><dd data-testid="member-role">{item.role_name}</dd></div>
          </dl>
        </li>)}
      </ul> : <p className="card" data-testid="members-empty">{value.total === 0 ? 'Участников пока нет.' : 'На этой странице нет участников. Выберите другую страницу.'}</p>}
    </>}
    <nav className={styles.pagination} aria-label="Страницы участников">
      <p>Страница {page}{pageCount !== null ? ` из ${pageCount}` : ''}. По {MEMBERS_PAGE_SIZE} участников.</p>
      <div className={styles.actions}>
        {page > 1 && <button className="buttonSecondary" type="button" onClick={() => goToPage(1)}>К первой странице</button>}
        <button className="buttonSecondary" type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Предыдущая</button>
        <button className="buttonSecondary" type="button" disabled={!value || page >= pageCount || page >= MEMBERS_MAX_PAGE} onClick={() => goToPage(page + 1)}>Следующая</button>
        {state.status !== 'error' && <button className="buttonSecondary" type="button" onClick={() => reader.current?.reload()}>Обновить список</button>}
      </div>
    </nav>
  </section>;
}

export default function MembersAccess() {
  const { loading, authScope, hasPermission } = useAuth();
  // Keep the Next router subscription, but validate the browser's raw query so
  // encoded keys/values cannot silently become an accepted canonical parameter.
  useSearchParams();
  const query = useSyncExternalStore(subscribeMembersLocation, rawMembersQuery, () => null);
  const page = membersPage(query);
  useLayoutEffect(() => {
    if (query === 'page=1') {
      // Next's documented null-data API carries its router state forward and
      // synchronizes hooks; passing its reserved state would bypass that work.
      window.history.replaceState(null, '', membersHref(1));
      window.dispatchEvent(new Event('alageum:members-location'));
    }
  }, [query]);
  if (loading || query === null) return <p role="status">Проверка доступа…</p>;
  if (!hasPermission('organization.manage_users')) return <section className="card"><p role="alert">У вашей учётной записи нет доступа к участникам организации.</p></section>;
  if (page === null) return <section className="card"><p role="alert">Некорректный номер страницы. Вернитесь к первой странице.</p><button className="buttonSecondary" type="button" onClick={() => goToPage(1)}>К первой странице</button></section>;
  return <MembersList key={`${authScope}:${page}`} scope={authScope} page={page} />;
}

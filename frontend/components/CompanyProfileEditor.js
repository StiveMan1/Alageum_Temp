'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getOrganizationProfile, updateOrganizationProfile } from '@/lib/api/organizations';
import { COMPANY_PROFILE_FIELDS, createCompanyProfileEditor, initialCompanyProfileState } from '@/lib/organizations/profile';
import styles from './CompanyProfileEditor.module.css';

function CompanyEditor({ scope, organizationId, editable }) {
  const { isAuthScopeCurrent, updateOrganization, registerOrganizationChange } = useAuth();
  const [state, setState] = useState(initialCompanyProfileState);
  const editor = useRef(null), errorBox = useRef(null), latestState = useRef(initialCompanyProfileState());
  useLayoutEffect(() => registerOrganizationChange(() => {
    const current = latestState.current;
    return {
      dirty: Boolean(current.editing && current.draft && current.snapshot && COMPANY_PROFILE_FIELDS.some(({ key }) => current.draft[key] !== (current.snapshot[key] ?? ''))),
      pending: current.pending,
    };
  }), [registerOrganizationChange]);
  useLayoutEffect(() => {
    const current = createCompanyProfileEditor({
      read: getOrganizationProfile, save: updateOrganizationProfile,
      isCurrent: () => isAuthScopeCurrent(scope), canEdit: () => editable,
      onChange: next => { latestState.current = next; setState(next); }, onConfirmed: snapshot => updateOrganization(snapshot, scope), organizationId,
    });
    editor.current = current;
    // Resolve after layout setup so React Strict Mode can discard its first flow.
    Promise.resolve().then(() => current.load());
    return () => { current.dispose(); if (editor.current === current) editor.current = null; };
  }, [scope, organizationId, editable, isAuthScopeCurrent, updateOrganization]);
  useEffect(() => { if (state.error) errorBox.current?.focus(); }, [state.error]);

  return <section className={`card ${styles.company}`} aria-labelledby="company-profile-heading" data-testid="company-profile" aria-busy={state.status === 'loading' || state.pending}>
    <h2 id="company-profile-heading">Профиль компании</h2>
    <p className="muted" id="company-contact-help">Рабочие контакты указаны вашей организацией и не проверены. Их сохранение не подтверждает email, телефон или адрес.</p>
    {state.status === 'loading' && <p role="status">Загрузка профиля компании…</p>}
    {state.error && <div ref={errorBox} tabIndex={-1} className={`error ${styles.notice}`} role="alert" data-testid={state.conflict ? 'profile-conflict' : 'profile-error'}>{state.error}</div>}
    {state.message && <p role="status" className={styles.notice}>{state.message}</p>}
    {state.status === 'error' && <button className="buttonSecondary" type="button" onClick={() => editor.current?.load()}>Повторить загрузку</button>}
    {state.status === 'ready' && <>
      {state.editing ? <form noValidate onSubmit={event => { event.preventDefault(); editor.current?.submit(); }} aria-label="Редактирование профиля компании">
        <div className={styles.fields}>
          {COMPANY_PROFILE_FIELDS.map(({ key, label, required, maxLength, multiline, inputMode }) => {
            const input = {
              id: `company-${key}`, name: key, value: state.draft[key], required, maxLength, inputMode,
              disabled: state.pending, autoComplete: 'off', 'aria-invalid': Boolean(state.errors[key]),
              'aria-describedby': `${key === 'name' ? '' : 'company-contact-help '}${state.errors[key] ? `company-error-${key}` : ''}`.trim() || undefined,
              onChange: event => editor.current?.change(key, event.target.value),
            };
            return <div className={multiline ? styles.wide : undefined} key={key}>
              <label htmlFor={input.id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
              {multiline ? <textarea {...input} rows={4} /> : <input {...input} type="text" />}
              {state.errors[key] && <p className="error" id={`company-error-${key}`}>{state.errors[key]}</p>}
            </div>;
          })}
        </div>
        <p className="muted">* Обязательное поле. Пустое необязательное поле удаляет сохранённое значение. Черновик хранится только на этой странице.</p>
        <div className={styles.actions}>
          <button className="button" type="submit" disabled={state.pending || state.conflict || state.requiresReload}>{state.pending ? 'Сохранение…' : 'Сохранить изменения'}</button>
          <button className="buttonSecondary" type="button" onClick={() => editor.current?.cancel()}>Отмена</button>
          {(state.conflict || state.requiresReload) && <button className="buttonSecondary" type="button" onClick={() => editor.current?.load()}>Загрузить актуальные данные</button>}
        </div>
        {state.pending && <p role="status">Ожидаем подтверждение сервера…</p>}
      </form> : <>
        <dl className={styles.values}>{COMPANY_PROFILE_FIELDS.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd data-testid={`company-value-${key}`}>{state.snapshot[key] || 'Не указано'}</dd></div>)}</dl>
        <div className={styles.actions}>
          {editable && !state.requiresReload && <button className="button" type="button" onClick={() => editor.current?.edit()}>Редактировать профиль компании</button>}
          <button className="buttonSecondary" type="button" onClick={() => editor.current?.load()}>{state.requiresReload ? 'Загрузить актуальные данные' : 'Обновить данные'}</button>
        </div>
        {!editable && <p className="muted">У вас есть доступ только к просмотру профиля компании.</p>}
      </>}
    </>}
  </section>;
}

export default function CompanyProfileEditor() {
  const { profile, loading, hasPermission, authScope } = useAuth();
  if (loading) return <p role="status">Проверка сессии…</p>;
  if (!profile) return <section className="card"><h2>Войдите в B2B кабинет</h2><p>Профиль доступен после входа.</p><Link className="button" href="/login?next=%2Fb2b%2Fprofile">Войти</Link></section>;
  const readable = hasPermission('organization.profile.read'), editable = readable && hasPermission('organization.profile.update');
  return <div className={styles.layout}>
    <section className="card" aria-labelledby="personal-profile-heading" data-testid="personal-profile">
      <h2 id="personal-profile-heading">Личный профиль</h2>
      <dl className={styles.values}><div><dt>Имя пользователя</dt><dd>{profile.user?.display_name || 'Не указано'}</dd></div><div><dt>Email для входа</dt><dd>{profile.user?.email || 'Не указан'}</dd></div></dl>
      <p className="muted">Организация: <span data-testid="current-organization-name">{profile.organization?.name}</span></p>
      <p className="muted">Данные учётной записи управляются отдельно от рабочих контактов компании.</p>
    </section>
    {readable ? <CompanyEditor key={`${authScope}:${editable}`} scope={authScope} organizationId={profile.organization.id} editable={editable} /> : <section className="card" data-testid="company-profile"><h2>Профиль компании</h2><p role="alert">У вашей учётной записи нет разрешения на просмотр профиля компании.</p></section>}
  </div>;
}

"use client";

import Link from "next/link";
import { Suspense, useCallback, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";
import OrganizationChooser, { organizationDestination } from "./OrganizationChooser";
import { loginDestination } from "@/lib/api/loginRedirect";
import { getSession } from "@/lib/api/client";
import { getSessionGeneration, subscribeSession } from "@/lib/api/sessionTransport";
import { supportAccess } from "@/lib/support/model";
import { rawMembersQuery, subscribeMembersLocation } from "@/lib/organizations/members";
import styles from "./OrganizationChooser.module.css";

const links = [
  ["/b2b", "Обзор", null],
  ["/b2b/orders", "Заказы", "order.read"],
  ["/b2b/documents", "Документы", "document.read"],
  ["/b2b/finance", "Финансы", "finance.read"],
  ["/b2b/quotes", "Запросы КП", "quote.read"],
  ["/b2b/support", "Поддержка", "ticket.read"],
  ["/b2b/profile", "Профиль", null],
  ["/b2b/members", "Участники", "organization.manage_users"],
];

function Navigation() {
  const { profile, loading, authError, hasPermission, setProfile } = useAuth();
  const router = useRouter(), pathname = usePathname();
  useSearchParams();
  const search = useSyncExternalStore(subscribeMembersLocation, rawMembersQuery, () => '');
  const destination = pathname === '/b2b/members' && search ? `${pathname}?${search}` : pathname;
  const trigger = useRef(null);
  const [choice, setChoice] = useState(null);
  useSyncExternalStore(subscribeSession, getSessionGeneration, () => 0);
  const close = useCallback(() => setChoice(null), []);
  const selected = useCallback(next => {
    setProfile(next); setChoice(null);
    router.replace(organizationDestination(destination));
  }, [setProfile, router, destination]);
  const tokenPresent = !loading && Boolean(getSession().access_token);

  return <aside className="sidebar">
    <section className={styles.active} aria-label="Текущая организация" data-testid="active-organization">
      {loading ? <p role="status">Проверка сессии…</p> : profile ? <>
        <p className="muted">Текущая организация</p>
        <strong>{profile.organization?.name}</strong>
        <span className={styles.uuid}>UUID: {profile.organization?.id}</span>
      </> : <p>{tokenPresent ? "Организация не выбрана или доступ изменился." : "Войдите, чтобы открыть B2B кабинет."}</p>}
      {!loading && authError && <p className="error" role="alert">{authError.status === 401 ? "Сессия завершилась. Войдите снова." : "Не удалось подтвердить доступ к организации."}</p>}
      {tokenPresent && <button ref={trigger} className="buttonSecondary" type="button" data-testid="organization-switch-trigger" onClick={() => setChoice({ generation: getSessionGeneration() })}>
        {profile ? "Сменить организацию" : "Выбрать организацию"}
      </button>}
      {!loading && !tokenPresent && <Link className="button" href={`/login?next=${encodeURIComponent(loginDestination(destination))}`}>Войти</Link>}
    </section>
    {profile && links.filter(([href, , permission]) => href === '/b2b/support' ? supportAccess(profile.permissions).visible : !permission || hasPermission(permission)).map(([href, label]) => (
      <Link key={href} href={href} prefetch={href === '/b2b/members' ? false : undefined} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
    ))}
    {choice && <OrganizationChooser modal expectedGeneration={choice.generation} currentOrganizationId={profile?.organization?.id} onCancel={close} onSelected={selected} returnFocusRef={trigger} />}
  </aside>;
}

export default function B2BNav() {
  return <Suspense fallback={<aside className="sidebar"><p role="status">Проверка сессии…</p></aside>}><Navigation /></Suspense>;
}

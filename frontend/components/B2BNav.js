"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import OrganizationChooser, { organizationDestination } from "./OrganizationChooser";
import { loginDestination } from "@/lib/api/loginRedirect";
import { getSession } from "@/lib/api/client";
import { getSessionGeneration, subscribeSession } from "@/lib/api/sessionTransport";
import styles from "./OrganizationChooser.module.css";

const links = [
  ["/b2b", "Обзор", null],
  ["/b2b/orders", "Заказы", "order.read"],
  ["/b2b/documents", "Документы", "document.read"],
  ["/b2b/finance", "Финансы", "finance.read"],
  ["/b2b/quotes", "Запросы КП", "quote.read"],
  ["/b2b/support", "Поддержка", "ticket.read"],
  ["/b2b/profile", "Профиль", null],
];

export default function B2BNav() {
  const { profile, loading, authError, hasPermission, setProfile } = useAuth();
  const router = useRouter(), pathname = usePathname();
  const trigger = useRef(null);
  const [choice, setChoice] = useState(null);
  useSyncExternalStore(subscribeSession, getSessionGeneration, () => 0);
  const close = useCallback(() => setChoice(null), []);
  const selected = useCallback(next => {
    setProfile(next); setChoice(null);
    router.replace(organizationDestination(pathname));
  }, [setProfile, router, pathname]);
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
      {!loading && !tokenPresent && <Link className="button" href={`/login?next=${encodeURIComponent(loginDestination(pathname))}`}>Войти</Link>}
    </section>
    {profile && links.filter(([, , permission]) => !permission || hasPermission(permission)).map(([href, label]) => (
      <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
    ))}
    {choice && <OrganizationChooser modal expectedGeneration={choice.generation} currentOrganizationId={profile?.organization?.id} onCancel={close} onSelected={selected} returnFocusRef={trigger} />}
  </aside>;
}

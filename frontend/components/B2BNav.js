"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

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
  const { profile, loading, hasPermission } = useAuth();
  if (loading) return <p>Проверка сессии…</p>;
  if (!profile) return <p className="error">Войдите, чтобы открыть B2B кабинет.</p>;
  return (
    <aside className="sidebar">
      {links.filter(([, , permission]) => !permission || hasPermission(permission)).map(([href, label]) => (
        <Link key={href} href={href}>{label}</Link>
      ))}
    </aside>
  );
}


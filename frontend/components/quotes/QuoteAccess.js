'use client';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
export default function QuoteAccess({ children, permission = 'quote.read', next = '/b2b/quotes' }) {
  const { profile, loading, hasPermission } = useAuth();
  if (loading) return <p role="status">Проверка сессии…</p>;
  if (!profile) return <div className="card"><h2>Войдите в B2B кабинет</h2><p>Запросы доступны только после входа.</p><Link className="button" href={`/login?next=${encodeURIComponent(next)}`}>Войти</Link></div>;
  if (!hasPermission(permission)) return <div className="card" role="alert"><h2>Нет доступа к запросам КП</h2><p>Для этого действия вашей учётной записи требуется разрешение.</p></div>;
  return children;
}

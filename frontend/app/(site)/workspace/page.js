import { Suspense } from 'react';
import Workspace from '@/components/workspace/Workspace';
import './workspace.css';

export const metadata = {
  title: 'Демо-кабинет · Запросы',
  description: 'Локальная демонстрация пути запроса: заказчик, уточнение и демо-ответ. Данные остаются в браузере и не отправляются в ALAGEUM Electric.',
};
export default function WorkspacePage() {
  return <Suspense fallback={<section className="catalog-page workspace-page"><p className="catalog-kicker">ДЕМО-КАБИНЕТ</p><h1>Локальные запросы</h1><p role="status">Открываем демо-кабинет…</p></section>}><Workspace /></Suspense>;
}

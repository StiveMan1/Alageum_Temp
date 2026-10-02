import { Suspense } from 'react';
import Comparison from '@/components/catalog/Comparison';
export const metadata = { title: 'Сравнение оборудования' };
export default function ComparePage() { return <Suspense fallback={<div className="catalog-page" role="status">Загрузка сравнения…</div>}><Comparison /></Suspense>; }

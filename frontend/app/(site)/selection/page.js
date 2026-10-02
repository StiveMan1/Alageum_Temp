import { Suspense } from 'react';
import Selection from '@/components/catalog/Selection';
export const metadata = { title: 'Моя подборка' };
export default function SelectionPage() { return <Suspense fallback={<div className="catalog-page">Загрузка подборки…</div>}><Selection /></Suspense>; }

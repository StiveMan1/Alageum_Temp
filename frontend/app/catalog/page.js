import { Suspense } from 'react';
import Catalog from '@/components/catalog/Catalog';
export const metadata = { title: 'Технический каталог' };
export default function CatalogPage() {
  return <Suspense fallback={<div className="catalog-page"><p role="status">Загрузка каталога…</p></div>}><Catalog /></Suspense>;
}

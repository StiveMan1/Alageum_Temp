import { Suspense } from 'react';
import CatalogSource from '@/components/catalog/CatalogSource';
export const metadata = {title:'Исходные каталоги · постраничные источники',description:'Постраничный источник импортированных серий, моделей, технических таблиц и чертежей.'};
export default function CatalogSourcePage(){return <Suspense fallback={<div className="catalog-page">Загрузка страницы каталога…</div>}><CatalogSource/></Suspense>;}

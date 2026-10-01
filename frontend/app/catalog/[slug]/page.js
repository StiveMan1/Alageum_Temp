import { Suspense } from 'react';
import ProductDetails from '@/components/catalog/ProductDetails';
import { products, productById } from '@/lib/catalog/data';
export function generateStaticParams() { return products.map((item) => ({ slug: item.id })); }
export async function generateMetadata({ params }) { const item = productById((await params).slug); return { title: item?.name || 'Характеристики оборудования', description: item?.description || 'Параметры и источник данных оборудования.' }; }
export default async function ProductPage({ params }) {
 const { slug } = await params;
 return <Suspense fallback={<div className="catalog-page" role="status">Загрузка карточки…</div>}><ProductDetails id={slug} /></Suspense>;
}

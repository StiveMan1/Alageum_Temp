"use client";

import Link from "next/link";
import ResourceList from "@/components/ResourceList";
import { getProducts } from "@/lib/api/catalog";

export default function CatalogPage() {
  return <section><h1>Каталог</h1><p className="muted">Данные загружаются из backend API.</p>
    <ResourceList load={getProducts} render={(product) => <Link className="card" key={product.id} href={`/catalog/${product.id}`}><h2>{product.translations?.ru?.name || product.slug}</h2><p className="muted">{product.sku}</p></Link>} />
  </section>;
}


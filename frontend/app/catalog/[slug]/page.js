"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProduct } from "@/lib/api/catalog";

export default function ProductPage() {
  const { slug } = useParams(); const [item, setItem] = useState(null); const [error, setError] = useState("");
  useEffect(() => { getProduct(slug).then(setItem).catch((reason) => setError(reason.message)); }, [slug]);
  if (error) return <p className="error">{error}</p>; if (!item) return <p>Загрузка…</p>;
  return <section><h1>{item.translations?.ru?.name || item.slug}</h1><p className="muted">SKU: {item.sku || "—"}</p><div className="card"><h2>Характеристики</h2>{item.attributes.map((a) => <p key={a.code}>{a.code}: {String(a.value)} {a.unit}</p>)}</div></section>;
}


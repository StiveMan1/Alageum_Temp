"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getOrder } from "@/lib/api/orders";
export default function OrderPage() { const { id } = useParams(); const [item, setItem] = useState(); const [error, setError] = useState(""); useEffect(() => { getOrder(id).then(setItem).catch((e) => setError(e.message)); }, [id]); if (error) return <p className="error">{error}</p>; if (!item) return <p>Загрузка…</p>; return <><h1>Заказ {item.number}</h1><div className="card"><p>Статус: {item.status}</p><p>Сумма: {item.amount} {item.currency}</p></div><h2>Позиции</h2>{item.items.map((x) => <div className="card" key={x.id}>{x.description} — {x.quantity}</div>)}</>; }


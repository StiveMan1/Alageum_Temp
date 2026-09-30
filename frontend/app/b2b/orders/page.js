"use client";
import Link from "next/link";
import ResourceList from "@/components/ResourceList";
import { getOrders } from "@/lib/api/orders";
export default function OrdersPage() { return <><h1>Заказы</h1><ResourceList load={getOrders} render={(x) => <Link className="card" href={`/b2b/orders/${x.id}`} key={x.id}><h3>{x.number}</h3><p>{x.amount} {x.currency}</p><span className="muted">{x.status}</span></Link>} /></>; }


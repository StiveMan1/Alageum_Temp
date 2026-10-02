"use client";
import ResourceList from "@/components/ResourceList";
import { getInvoices } from "@/lib/api/finance";
export default function FinancePage() { return <><h1>Финансы</h1><ResourceList load={getInvoices} render={(x) => <div className="card" key={x.id}><h3>{x.number}</h3><p>{x.amount} {x.currency}</p><span className="muted">{x.status}</span></div>} /></>; }


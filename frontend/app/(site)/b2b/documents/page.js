"use client";
import ResourceList from "@/components/ResourceList";
import { getDocuments } from "@/lib/api/documents";
export default function DocumentsPage() { return <><h1>Документы</h1><ResourceList load={getDocuments} render={(x) => <div className="card" key={x.id}><h3>{x.title}</h3><p>{x.number || "Без номера"}</p><span className="muted">{x.type_code}</span></div>} /></>; }


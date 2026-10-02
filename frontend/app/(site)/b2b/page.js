"use client";

import { useAuth } from "@/components/AuthProvider";
export default function Dashboard() {
  const { profile } = useAuth();
  return <><h1>B2B кабинет</h1><div className="card"><p>Организация: {profile?.organization?.name || "—"}</p><p className="muted">Доступные разделы формируются из permission list backend.</p></div></>;
}


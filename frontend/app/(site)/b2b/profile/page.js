"use client";
import { useAuth } from "@/components/AuthProvider";
export default function ProfilePage() { const { profile } = useAuth(); return <><h1>Профиль</h1><div className="card"><h2>{profile?.user?.display_name || "—"}</h2><p>{profile?.user?.email}</p><p className="muted">{profile?.organization?.name}</p></div></>; }


"use client";

import { useAuth } from "@/components/AuthProvider";
import SupportWorkspace from "@/components/support/SupportWorkspace";
import { supportAccess } from "@/lib/support/model";

export default function SupportPage() {
  const { profile, loading, authScope } = useAuth();
  const { readable, creatable } = supportAccess(profile?.permissions);
  return <>
    <h1>Поддержка</h1>
    {loading ? <p role="status">Проверка доступа…</p> : !readable && !creatable ?
      <section className="card"><p role="alert">У вашей учётной записи нет доступа к обращениям поддержки.</p></section> :
      <SupportWorkspace key={`${authScope}:${readable}:${creatable}`} scope={authScope} readable={readable} creatable={creatable} />}
  </>;
}

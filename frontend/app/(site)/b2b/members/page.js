import { Suspense } from 'react';
import MembersAccess from '@/components/members/MembersWorkspace';

export default function MembersPage() {
  return <><h1>Участники</h1><Suspense fallback={<p role="status">Проверка доступа…</p>}><MembersAccess /></Suspense></>;
}

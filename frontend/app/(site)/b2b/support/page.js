"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ResourceList from "@/components/ResourceList";
import { useAuth } from "@/components/AuthProvider";
import { createTicket, getTicketCategories, getTickets } from "@/lib/api/support";

export default function SupportPage() {
  const { authScope, isAuthScopeCurrent, registerOrganizationChange } = useAuth();
  const [categories, setCategories] = useState([]);
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [requiresReload, setRequiresReload] = useState(false);
  const form = useRef(null), request = useRef(null), mounted = useRef(false);
  const load = useCallback(() => getTickets(reload), [reload]);
  useLayoutEffect(() => {
    mounted.current = true;
    const unregister = registerOrganizationChange(() => {
      return { dirty: ["category_id", "subject", "message"].some(key => Boolean(form.current?.elements.namedItem(key)?.value)), pending: Boolean(request.current) };
    });
    return () => { mounted.current = false; request.current?.abort(); request.current = null; unregister(); };
  }, [registerOrganizationChange]);
  useEffect(() => {
    let active = true;
    getTicketCategories().then(items => { if (active && isAuthScopeCurrent(authScope)) setCategories(items); }).catch(() => { if (active) setCategories([]); });
    return () => { active = false; };
  }, [authScope, isAuthScopeCurrent]);

  async function submit(event) {
    event.preventDefault();
    if (request.current || requiresReload || !isAuthScopeCurrent(authScope)) return;
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    const controller = new AbortController();
    request.current = controller;
    const current = () => mounted.current && request.current === controller && !controller.signal.aborted && isAuthScopeCurrent(authScope);
    setPending(true); setMessage("");
    try {
      await createTicket({ category_id: values.get("category_id"), subject: values.get("subject"), message: values.get("message") }, { signal: controller.signal });
      if (!current()) return;
      formElement.reset(); setMessage("Обращение создано"); setReload(value => value + 1);
    } catch (error) {
      if (!current()) return;
      const uncertain = ![400, 401, 403, 404, 409, 422].includes(error.status);
      setRequiresReload(uncertain);
      setMessage(uncertain ? "Не удалось подтвердить отправку. Обращение могло быть создано. Проверьте список обращений перед повторной отправкой." : error.message);
    } finally {
      if (current()) { request.current = null; setPending(false); }
    }
  }
  return <>
    <h1>Поддержка</h1>
    <form ref={form} className="form card" onSubmit={submit} aria-label="Новое обращение" aria-busy={pending}>
      <label>Категория<select name="category_id" required defaultValue="" disabled={pending}>
        <option value="" disabled>Выберите категорию</option>
        {categories.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
      </select></label>
      <label>Тема<input name="subject" maxLength="300" required disabled={pending} /></label>
      <label>Сообщение<textarea name="message" maxLength="10000" required disabled={pending} /></label>
      <button className="button" disabled={pending || requiresReload}>{pending ? "Отправка…" : "Создать обращение"}</button>
      {message && <p role="status">{message}</p>}
      {requiresReload && <button className="buttonSecondary" type="button" onClick={() => { setReload(value => value + 1); setRequiresReload(false); }}>Обновить список обращений</button>}
    </form>
    <ResourceList load={load} render={item => <div className="card" key={item.id}>
      <h3>{item.subject}</h3><p>{item.category}</p><span className="muted">{item.status}</span>
    </div>} />
  </>;
}

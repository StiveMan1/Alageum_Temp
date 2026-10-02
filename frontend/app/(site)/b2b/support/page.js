"use client";

import { useCallback, useEffect, useState } from "react";
import ResourceList from "@/components/ResourceList";
import { createTicket, getTicketCategories, getTickets } from "@/lib/api/support";

export default function SupportPage() {
  const [categories, setCategories] = useState([]);
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState("");
  const load = useCallback(() => getTickets(reload), [reload]);
  useEffect(() => { getTicketCategories().then(setCategories).catch(() => setCategories([])); }, []);
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await createTicket({
        category_id: form.get("category_id"),
        subject: form.get("subject"),
        message: form.get("message"),
      });
      formElement.reset();
      setMessage("Обращение создано");
      setReload((value) => value + 1);
    } catch (error) { setMessage(error.message); }
  }
  return <>
    <h1>Поддержка</h1>
    <form className="form card" onSubmit={submit}>
      <label>Категория<select name="category_id" required defaultValue="">
        <option value="" disabled>Выберите категорию</option>
        {categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
      </select></label>
      <label>Тема<input name="subject" maxLength="300" required /></label>
      <label>Сообщение<textarea name="message" maxLength="10000" required /></label>
      <button className="button">Создать обращение</button>
      {message && <p role="status">{message}</p>}
    </form>
    <ResourceList load={load} render={(item) => <div className="card" key={item.id}>
      <h3>{item.subject}</h3><p>{item.category}</p><span className="muted">{item.status}</span>
    </div>} />
  </>;
}

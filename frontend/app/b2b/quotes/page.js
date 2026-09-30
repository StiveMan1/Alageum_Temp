"use client";

import { useCallback, useState } from "react";
import ResourceList from "@/components/ResourceList";
import { createQuote, getQuotes } from "@/lib/api/quotes";

export default function QuotesPage() {
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState("");
  const load = useCallback(() => getQuotes(reload), [reload]);
  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await createQuote({
        comment: form.get("comment"),
        items: [{ quantity: form.get("quantity"), parameters: {} }],
      });
      formElement.reset();
      setMessage("Запрос создан");
      setReload((value) => value + 1);
    } catch (error) { setMessage(error.message); }
  }
  return <>
    <h1>Запросы КП</h1>
    <form className="form card" onSubmit={submit}>
      <label>Количество<input name="quantity" type="number" min="0.001" step="0.001" required /></label>
      <label>Комментарий<textarea name="comment" maxLength="4000" /></label>
      <button className="button">Создать запрос</button>
      {message && <p role="status">{message}</p>}
    </form>
    <ResourceList load={load} render={(item) => <div className="card" key={item.id}>
      <h3>Запрос {item.id.slice(0, 8)}</h3><p>{item.item_count} позиций</p>
      <span className="muted">{item.status}</span>
    </div>} />
  </>;
}

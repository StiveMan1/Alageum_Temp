"use client";

import { useEffect, useState } from "react";

export default function ResourceList({ load, empty = "Данных пока нет", render }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    load().then((value) => active && setItems(value)).catch((reason) => active && setError(reason));
    return () => { active = false; };
  }, [load, attempt]);
  if (error) {
    const label = error.status === 403 ? "Нет доступа" : error.status === 404 ? "Не найдено" :
      error.status ? error.message : "Backend временно недоступен";
    const retry = () => { setError(null); setItems(null); setAttempt((x) => x + 1); };
    return <div className="card"><p className="error">{label}</p><button className="buttonSecondary" onClick={retry}>Повторить</button></div>;
  }
  if (!items) return <p className="muted">Загрузка…</p>;
  if (!items.length) return <div className="card muted">{empty}</div>;
  return <div className="grid">{items.map(render)}</div>;
}

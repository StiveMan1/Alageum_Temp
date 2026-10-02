"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { loginDestination } from "@/lib/api/loginRedirect";
import { login } from "@/lib/api/auth";
import { useAuth } from "@/components/AuthProvider";

const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function LoginPage() {
  const router = useRouter();
  // A native form submit before hydration loses the approved return URL.
  // Keep the server-rendered controls disabled until handlers are attached.
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const { setProfile } = useAuth();
  const [email, setEmail] = useState("buyer@demo.example");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const activeFlow = useRef(null);
  useLayoutEffect(() => {
    const flow = { controller: new AbortController() };
    activeFlow.current = flow;
    return () => { flow.controller.abort(); if (activeFlow.current === flow) activeFlow.current = null; };
  }, []);
  async function submit(event) {
    event.preventDefault();
    const flow = activeFlow.current;
    const current = () => flow && activeFlow.current === flow && !flow.controller.signal.aborted;
    if (submitting.current || !current()) return;
    submitting.current = true; setPending(true); setError("");
    try {
      const profile = await login(email, password, { signal: flow.controller.signal });
      if (current()) { setProfile(profile); router.replace(loginDestination(new URLSearchParams(window.location.search).get("next"))); }
    }
    catch (reason) { if (current()) setError(reason.message); }
    finally { if (current()) { submitting.current = false; setPending(false); } }
  }
  return (
    <section>
      <h1>Вход в B2B кабинет</h1>
      <form className="form card" onSubmit={submit}>
        <label>Email<input disabled={!ready} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label>Пароль<input disabled={!ready} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" disabled={!ready || pending}>{pending ? "Вход…" : "Войти"}</button>
      </form>
    </section>
  );
}

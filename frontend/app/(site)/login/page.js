"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { loginDestination } from "@/lib/api/loginRedirect";
import { login } from "@/lib/api/auth";
import { clearSession, getSession } from "@/lib/api/client";
import { getSessionGeneration, subscribeSession } from "@/lib/api/sessionTransport";
import { useAuth } from "@/components/AuthProvider";
import OrganizationChooser from "@/components/OrganizationChooser";

const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function LoginPage() {
  const router = useRouter();
  // Keep server-rendered controls disabled until the approved return URL can be preserved.
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const sessionGeneration = useSyncExternalStore(subscribeSession, getSessionGeneration, () => 0);
  const { profile, loading, setProfile } = useAuth();
  const [email, setEmail] = useState("buyer@demo.example");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [choice, setChoice] = useState(null);
  const emailInput = useRef(null), submitting = useRef(false), activeFlow = useRef(null);
  useLayoutEffect(() => {
    const flow = { controller: new AbortController() };
    activeFlow.current = flow;
    return () => { flow.controller.abort(); if (activeFlow.current === flow) activeFlow.current = null; };
  }, []);

  const complete = useCallback(next => {
    setProfile(next); setChoice(null); setPassword("");
    router.replace(loginDestination(new URLSearchParams(window.location.search).get("next")));
  }, [router, setProfile]);
  const cancelChoice = useCallback(generation => {
    if (getSessionGeneration() === generation) { clearSession(); setProfile(null); }
    setChoice(null); setPassword(""); setError(""); setPending(false); submitting.current = false;
    requestAnimationFrame(() => emailInput.current?.focus());
  }, [setProfile]);

  async function submit(event) {
    event.preventDefault();
    const flow = activeFlow.current;
    const current = () => flow && activeFlow.current === flow && !flow.controller.signal.aborted;
    if (submitting.current || !current()) return;
    submitting.current = true; setPending(true); setError("");
    try {
      const next = await login(email, password, { signal: flow.controller.signal });
      if (!current()) return;
      setPassword("");
      if (next.requiresOrganization) setChoice({ generation: next.sessionGeneration });
      else complete(next);
    } catch (reason) { if (current()) setError(reason.message); }
    finally { if (current()) { submitting.current = false; setPending(false); } }
  }

  // A page reopened after an interrupted login can resume the authenticated
  // membership choice without retaining credentials or choosing the first name.
  const resumeChoice = ready && !pending && !loading && !profile && Boolean(getSession().access_token);
  if (resumeChoice && !choice) setChoice({ generation: sessionGeneration });
  const choiceGeneration = choice?.generation ?? (resumeChoice ? sessionGeneration : null);
  return <section>
    <h1>Вход в B2B кабинет</h1>
    {choiceGeneration !== null ? <OrganizationChooser key={choiceGeneration} expectedGeneration={choiceGeneration} onCancel={cancelChoice} onSelected={complete} /> : <form className="form card" onSubmit={submit}>
      <label>Email<input ref={emailInput} disabled={!ready || pending} value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="username" required /></label>
      <label>Пароль<input disabled={!ready || pending} value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button" disabled={!ready || pending}>{pending ? "Вход…" : "Войти"}</button>
    </form>}
  </section>;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/auth";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { setProfile } = useAuth();
  const [email, setEmail] = useState("buyer@demo.example");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setError("");
    try { setProfile(await login(email, password)); router.push("/b2b"); }
    catch (reason) { setError(reason.message); }
  }
  return (
    <section>
      <h1>Вход в B2B кабинет</h1>
      <form className="form card" onSubmit={submit}>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label>Пароль<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
        {error && <p className="error">{error}</p>}
        <button className="button">Войти</button>
      </form>
    </section>
  );
}

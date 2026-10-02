import { ApiError, apiFetch, clearSession, getSession, setSession } from "./client.js";
import { getSessionGeneration } from "./sessionTransport.js";

let loginAttempt = 0;
export async function login(email, password, { signal } = {}) {
  const attempt = ++loginAttempt;
  let generation = getSessionGeneration();
  const assertCurrent = () => {
    if (signal?.aborted || attempt !== loginAttempt || getSessionGeneration() !== generation) {
      throw new ApiError(401, { error: { code: 'session_changed', message: 'Сессия изменилась. Повторите вход.' } });
    }
  };
  const pair = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }), signal });
  assertCurrent();
  setSession(pair);
  generation = getSessionGeneration();
  const profile = await apiFetch("/auth/me", { signal });
  assertCurrent();
  // /me may have legitimately rotated tokens. Keep those current credentials.
  setSession({ ...getSession(), organization_id: profile.organization.id });
  return profile;
}
export const me = () => apiFetch("/auth/me");
export async function logout() {
  loginAttempt += 1;
  const generation = getSessionGeneration();
  const session = getSession();
  if (session.refresh_token) await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
  if (getSessionGeneration() === generation) clearSession();
}

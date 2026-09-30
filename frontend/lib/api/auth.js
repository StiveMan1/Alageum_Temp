import { apiFetch, clearSession, getSession, setSession } from "./client";

export async function login(email, password) {
  const pair = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  setSession(pair);
  const profile = await apiFetch("/auth/me");
  setSession({ ...pair, organization_id: profile.organization.id });
  return profile;
}
export const me = () => apiFetch("/auth/me");
export async function logout() {
  const session = getSession();
  if (session.refresh_token) await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
  clearSession();
}


import { clearSession, getSession, setSession } from "./sessionTransport";

export { clearSession, getSession, setSession } from "./sessionTransport";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || `API request failed (${status})`);
    this.status = status;
    this.code = payload?.error?.code;
    this.details = payload?.error?.details;
  }
}

let refreshPromise = null;

async function rotateSession() {
  const session = getSession();
  if (!session.refresh_token) throw new ApiError(401, { error: { code: "session_expired" } });
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
      cache: "no-store",
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new ApiError(response.status, payload);
      setSession({ ...payload, organization_id: session.organization_id });
      return payload;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

function expireSession() {
  clearSession();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("alageum:session-expired"));
}

export async function apiFetch(path, options = {}, retry = true) {
  const session = getSession();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (session.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  if (session.organization_id) headers.set("X-Organization-ID", session.organization_id);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  if (response.status === 401 && retry && session.refresh_token && !path.startsWith("/auth/")) {
    try {
      await rotateSession();
      return apiFetch(path, options, false);
    } catch (error) {
      expireSession();
      throw error;
    }
  }
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

export async function apiPage(path, options = {}) {
  const payload = await apiFetch(path, options);
  return payload?.items || [];
}

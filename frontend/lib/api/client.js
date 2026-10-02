import { clearSession, getSession, setSession } from "./sessionTransport.js";

export { clearSession, getSession, setSession } from "./sessionTransport.js";

// Vercel Services routes the browser's same-origin API requests to FastAPI.
// The explicit override still supports the separate-port Docker/local setup.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || `API request failed (${status})`);
    this.status = status;
    this.code = payload?.error?.code;
    this.details = payload?.error?.details;
  }
}

let refreshFlight = null;

function sameSession(left, right = getSession()) {
  return left.access_token === right.access_token && left.refresh_token === right.refresh_token &&
    left.organization_id === right.organization_id;
}
function sessionChanged() {
  return new ApiError(401, { error: { code: "session_changed", message: "Session changed while the request was pending" } });
}

async function rotateSession(session) {
  if (!sameSession(session)) throw sessionChanged();
  if (!session.refresh_token) throw new ApiError(401, { error: { code: "session_expired" } });
  if (refreshFlight && sameSession(refreshFlight.session, session)) return refreshFlight.promise;
  const flight = { session, promise: null };
  flight.promise = fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
    cache: "no-store",
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    // Never let an old refresh overwrite credentials installed by a newer login.
    if (!sameSession(session)) throw sessionChanged();
    if (!response.ok) throw new ApiError(response.status, payload);
    const rotated = { ...payload, organization_id: session.organization_id };
    setSession(rotated);
    return rotated;
  }).finally(() => { if (refreshFlight === flight) refreshFlight = null; });
  refreshFlight = flight;
  return flight.promise;
}

function expireSession(requestSession) {
  const current = getSession();
  // A delayed unauthorized response belongs only to the credentials it used.
  // It must not sign out an account that logged in while the request was pending.
  if (requestSession && !sameSession(requestSession, current)) return;
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
      const rotated = await rotateSession(session);
      if (!sameSession(rotated)) throw sessionChanged();
      return apiFetch(path, options, false);
    } catch (error) {
      expireSession(session);
      throw error;
    }
  }
  if (response.status === 401 && !path.startsWith("/auth/")) expireSession(session);
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

export async function apiPage(path, options = {}) {
  const payload = await apiFetch(path, options);
  return payload?.items || [];
}

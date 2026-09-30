// Browser token transport boundary. No component accesses Web Storage directly.
// The current per-tab DEV transport is intentionally replaceable by a same-site
// HttpOnly cookie/BFF transport after deployment topology and CSRF policy are approved.
const SESSION_KEY = "alageum_session";

export function getSession() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setSession(value) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  }
}

export function clearSession() {
  if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_KEY);
}

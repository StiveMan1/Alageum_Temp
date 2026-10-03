// Browser token transport boundary. No component accesses Web Storage directly.
// The current per-tab DEV transport is intentionally replaceable by a same-site
// HttpOnly cookie/BFF transport after deployment topology and CSRF policy are approved.
const SESSION_KEY = "alageum_session";
let generation = 0;
let fingerprint = null;

function sessionFingerprint() {
  const session = getSession();
  return JSON.stringify([session.access_token, session.refresh_token, session.organization_id]);
}

// A login boundary is independent of user/tenant identity. Refreshing credentials
// preserves it; logging in again to the same account starts a new boundary.
export function getSessionGeneration() {
  if (typeof window === "undefined") return 0;
  const current = sessionFingerprint();
  if (fingerprint !== null && fingerprint !== current) generation += 1;
  fingerprint = current;
  return generation;
}

export function subscribeSession(listener) {
  // A restored document may have missed a session notification while inactive.
  // Let the existing snapshot fingerprint decide whether its boundary changed.
  const restored = event => { if (event.persisted) listener(event); };
  window.addEventListener("alageum:session-changed", listener);
  window.addEventListener("storage", listener);
  window.addEventListener("pageshow", restored);
  return () => {
    window.removeEventListener("alageum:session-changed", listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("pageshow", restored);
  };
}

export function getSession() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setSession(value, { preserveGeneration = false } = {}) {
  if (typeof window !== "undefined") {
    getSessionGeneration();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    if (!preserveGeneration) generation += 1;
    fingerprint = sessionFingerprint();
    window.dispatchEvent(new Event("alageum:session-changed"));
  }
}

export function clearSession() {
  if (typeof window !== "undefined") {
    getSessionGeneration();
    sessionStorage.removeItem(SESSION_KEY);
    generation += 1;
    fingerprint = sessionFingerprint();
    window.dispatchEvent(new Event("alageum:session-changed"));
  }
}

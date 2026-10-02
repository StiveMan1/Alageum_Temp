"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { me } from "@/lib/api/auth";
import { getSession } from "@/lib/api/client";
import { getSessionGeneration, subscribeSession } from "@/lib/api/sessionTransport";
import { organizationProfileScope } from "@/lib/organizations/profile";

const AuthContext = createContext({ profile: null, loading: true, hasPermission: () => false });

export function AuthProvider({ children }) {
  const [state, updateState] = useState(null);
  const profileGeneration = useRef(0);
  const profileReadGeneration = useRef(0);
  const currentProfile = useRef(null);
  const sessionGeneration = useSyncExternalStore(subscribeSession, getSessionGeneration, () => 0);
  const loading = !state || state.sessionGeneration !== sessionGeneration;
  const profile = loading ? null : state.profile;
  const setProfile = useCallback((next) => {
    const generation = ++profileGeneration.current;
    profileReadGeneration.current += 1;
    currentProfile.current = next;
    updateState({ profile: next, generation, sessionGeneration: getSessionGeneration() });
  }, []);
  useEffect(() => {
    const generation = ++profileGeneration.current;
    const readGeneration = ++profileReadGeneration.current;
    let active = true;
    const current = () => active && profileGeneration.current === generation && profileReadGeneration.current === readGeneration && getSessionGeneration() === sessionGeneration;
    const expired = () => setProfile(null);
    window.addEventListener("alageum:session-expired", expired);
    const loadProfile = async () => getSession().access_token ? me() : null;
    const install = value => {
      if (current()) {
        currentProfile.current = value;
        updateState({ profile: value, generation, sessionGeneration });
      }
    };
    loadProfile().then(install).catch(() => install(null));
    return () => { active = false; window.removeEventListener("alageum:session-expired", expired); };
  }, [setProfile, sessionGeneration]);
  const isAuthScopeCurrent = useCallback(scope => Boolean(scope &&
    scope === organizationProfileScope(currentProfile.current, profileGeneration.current, getSessionGeneration()) &&
    getSession().access_token && (!getSession().organization_id || getSession().organization_id === currentProfile.current?.organization?.id)), []);
  const updateOrganization = useCallback((snapshot, scope) => {
    if (!isAuthScopeCurrent(scope) || snapshot.organization_id !== currentProfile.current?.organization?.id) return;
    profileReadGeneration.current += 1;
    const next = { ...currentProfile.current, organization: { ...currentProfile.current.organization, name: snapshot.name } };
    currentProfile.current = next;
    updateState(previous => isAuthScopeCurrent(scope) ? { ...previous, profile: next } : previous);
  }, [isAuthScopeCurrent]);
  const value = useMemo(() => ({
    profile,
    loading,
    setProfile,
    authScope: organizationProfileScope(profile, state?.generation, sessionGeneration),
    isAuthScopeCurrent,
    updateOrganization,
    hasPermission: (code) => profile?.permissions?.includes(code) || false,
  }), [profile, loading, setProfile, state?.generation, sessionGeneration, isAuthScopeCurrent, updateOrganization]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

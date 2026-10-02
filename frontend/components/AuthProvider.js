"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { me } from "@/lib/api/auth";
import { getSession } from "@/lib/api/client";

const AuthContext = createContext({ profile: null, loading: true, hasPermission: () => false });

export function AuthProvider({ children }) {
  const [profile, updateProfile] = useState(null);
  const profileGeneration = useRef(0);
  const [loading, setLoading] = useState(true);
  const setProfile = useCallback((next) => {
    profileGeneration.current += 1;
    updateProfile(next);
    setLoading(false);
  }, []);
  useEffect(() => {
    const generation = ++profileGeneration.current;
    let active = true;
    const current = () => active && profileGeneration.current === generation;
    const expired = () => setProfile(null);
    window.addEventListener("alageum:session-expired", expired);
    const loadProfile = async () => getSession().access_token ? me() : null;
    loadProfile().then(value => { if (current()) updateProfile(value); })
      .catch(() => { if (current()) updateProfile(null); })
      .finally(() => { if (current()) setLoading(false); });
    return () => { active = false; window.removeEventListener("alageum:session-expired", expired); };
  }, [setProfile]);
  const value = useMemo(() => ({
    profile,
    loading,
    setProfile,
    hasPermission: (code) => profile?.permissions?.includes(code) || false,
  }), [profile, loading, setProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

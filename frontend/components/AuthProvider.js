"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { me } from "@/lib/api/auth";
import { getSession } from "@/lib/api/client";

const AuthContext = createContext({ profile: null, loading: true, hasPermission: () => false });

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const expired = () => setProfile(null);
    window.addEventListener("alageum:session-expired", expired);
    const loadProfile = async () => getSession().access_token ? me() : null;
    loadProfile().then(setProfile).catch(() => setProfile(null)).finally(() => setLoading(false));
    return () => window.removeEventListener("alageum:session-expired", expired);
  }, []);
  const value = useMemo(() => ({
    profile,
    loading,
    setProfile,
    hasPermission: (code) => profile?.permissions?.includes(code) || false,
  }), [profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

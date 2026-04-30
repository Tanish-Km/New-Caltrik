import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, getToken, formatApiError } from "./api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [targets, setTargets] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setTargets(data.targets);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    await loadMe();
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    setToken(data.token);
    setUser(data.user);
    await loadMe();
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {
      // Ignore logout errors - still clear local state
    }
    setToken(null);
    setUser(null);
    setTargets(null);
  };

  const refreshProfile = loadMe;

  return (
    <AuthCtx.Provider value={{ user, targets, loading, login, register, logout, refreshProfile, formatApiError }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);

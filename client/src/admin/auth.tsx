import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { api, setAdminToken } from "@/lib/api";

export interface AdminUser {
  id: number;
  email: string;
  name?: string;
}

interface AuthCtx {
  user: AdminUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

/** Token lives in memory only; the httpOnly cookie set by the server restores the session on reload via /auth/me. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<{ user?: AdminUser } | AdminUser>("/admin/auth/me")
      .then((res) => {
        if (!alive) return;
        const u = (res as { user?: AdminUser }).user ?? (res as AdminUser);
        if (u && "email" in u) setUser(u);
      })
      .catch(() => undefined)
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: AdminUser }>("/admin/auth/login", { email, password });
    setAdminToken(res.token);
    setUser(res.user);
  }, []);
  const logout = useCallback(async () => {
    try {
      await api.post("/admin/auth/logout");
    } catch {
      /* ignore */
    }
    setAdminToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <p className="p-8 text-sm text-ink-soft">Checking session…</p>;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

// Auth state: token persisted in localStorage, current user in memory + localStorage.
// login / register store the token and navigate to /shelf; logout clears everything.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { data } from '../lib/data';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [ready, setReady] = useState(false);

  // Revalidate the session on load if we have a token but no cached user.
  useEffect(() => {
    let active = true;
    (async () => {
      if (token && !user) {
        const u = await data.me(token);
        if (active && u) {
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        }
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((t: string, u: User) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await data.login(email, password);
      persist(res.token, res.user);
    },
    [persist],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await data.register(email, password);
      persist(res.token, res.user);
    },
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, ready, login, register, logout }),
    [user, token, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

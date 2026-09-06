import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "./api";
import { fetchMe, login as apiLogin, logout as apiLogout } from "./api";
import { deleteStoredItem, getStoredItem, setStoredItem } from "./storage";

const TOKEN_KEY = "lpugpt_token";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getStoredItem(TOKEN_KEY);
        if (!stored) return;
        const { user: u } = await fetchMe(stored);
        setToken(stored);
        setUser(u);
      } catch {
        await deleteStoredItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: u, token: t } = await apiLogin(email, password);
    await setStoredItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await apiLogout(token);
      } catch {
        // ignore
      }
    }
    await deleteStoredItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, loading, signIn, signOut }),
    [user, token, loading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

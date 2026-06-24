"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { fetchMe, logout as authLogout, type MeResponse } from "@/lib/auth";

interface AuthContextValue {
  user: MeResponse | null;
  loading: boolean;
  error: string;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const loadUser = useCallback(() => {
    fetchMe()
      .then((me) => {
        startTransition(() => {
          if (me.role !== "admin") {
            setError("当前账号无管理员权限");
            setUser(null);
          } else {
            setUser(me);
            setError("");
          }
          setLoading(false);
        });
      })
      .catch((err) => {
        startTransition(() => {
          setError(err instanceof Error ? err.message : "获取用户信息失败");
          setUser(null);
          setLoading(false);
        });
      });
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogout = useCallback(() => {
    authLogout();
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        logout: handleLogout,
        refresh: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

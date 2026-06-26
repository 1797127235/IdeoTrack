"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { Button, Spinner } from "@/components/ui";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={28} />
          <span className="text-sm text-[var(--color-ink-secondary)]">加载中…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="text-center">
          <p className="text-sm text-[var(--color-danger)] mb-4">
            登录已过期，请重新登录
          </p>
          <Button onClick={() => router.push("/login")}>返回登录</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

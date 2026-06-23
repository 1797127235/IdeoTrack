"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken, logout } from "@/lib/api";
import { decodeJwtPayload, isTokenValid } from "@/lib/jwt";

/**
 * 管理员守卫 —— 镜像 mobile/components/RoleGuard.tsx。
 * 由 app/(admin)/layout.tsx 包裹，保护整个 admin 路由组。
 *
 * 行为：
 * - 无 token / 过期 → 清 token + 跳 /login
 * - role !== 'admin' → 清 token + 显示无权限页（含登出入口）
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");

  useEffect(() => {
    const token = getToken();
    if (!token || !isTokenValid(token)) {
      clearToken();
      router.replace("/login");
      return;
    }

    const payload = decodeJwtPayload(token);
    if (payload?.role !== "admin") {
      // 非管理员：清掉错误角色的 token，避免 /login 又跳回造成死循环
      clearToken();
      setState("forbidden");
      return;
    }

    setState("ok");
  }, [router]);

  if (state === "loading") {
    return (
      <div className="loading">
        <p>加载中…</p>
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="forbidden">
        <h1>无权访问</h1>
        <p>当前账号不是管理员，无法进入管理后台。</p>
        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          返回登录
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

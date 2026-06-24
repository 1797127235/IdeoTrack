"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const titleMap: Record<string, string> = {
  "/": "数据概览",
  "/tasks": "任务管理",
  "/tasks/create": "新建任务",
  "/quotes": "名言管理",
  "/organizations": "组织架构",
  "/users": "用户管理",
  "/reports": "报表导出",
  "/operations": "系统运维",
};

export default function TopBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const title = titleMap[pathname] || "管理后台";

  const displayName = user?.name || user?.schoolId || "管理员";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-14 flex items-center justify-between px-8 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--color-ink-secondary)]">
          {displayName}
        </span>
        <button
          onClick={logout}
          className="text-sm text-[var(--color-ink-secondary)] hover:text-[var(--color-danger)] transition-colors"
        >
          退出
        </button>
        <div className="w-8 h-8 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-sm font-medium text-[var(--color-accent)]">
          {initial}
        </div>
      </div>
    </header>
  );
}

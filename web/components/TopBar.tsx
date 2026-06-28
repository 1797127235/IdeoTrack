"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";

const titleMap: Record<string, string> = {
  "/": "数据概览",
  "/tasks": "任务管理",
  "/tasks/create": "新建任务",
  "/task-templates": "任务模板库",
  "/task-templates/create": "新建模板",
  "/quotes": "名言管理",
  "/organizations": "组织架构",
  "/users": "用户管理",
  "/operations": "系统运维",
};

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const title = titleMap[pathname] || "管理后台";
  const displayName = user?.name || user?.schoolId || "管理员";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-8 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] transition-colors"
          aria-label="打开导航"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h1>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg p-1.5 pr-3 hover:bg-[var(--color-bg)] transition-colors"
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-sm font-medium text-[var(--color-accent)]">
            {initial}
          </div>
          <span className="hidden sm:block text-sm font-medium text-[var(--color-ink-secondary)] max-w-[10rem] truncate">
            {displayName}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-[var(--color-ink-muted)] transition-transform",
              menuOpen && "rotate-180"
            )}
          />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm z-50 py-1">
              <div className="px-4 py-2 border-b border-[var(--color-border)]">
                <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                  {displayName}
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] truncate">
                  管理员
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

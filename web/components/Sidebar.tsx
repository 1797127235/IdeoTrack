"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const navItems = [
  { href: "/", label: "数据概览" },
  { href: "/tasks", label: "任务管理" },
  { href: "/quotes", label: "名言管理" },
  { href: "/organizations", label: "组织架构" },
  { href: "/users", label: "用户管理" },
  { href: "/reports", label: "报表导出" },
  { href: "/operations", label: "系统运维" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">
      <div className="h-14 flex items-center px-6 border-b border-[var(--color-border)]">
        <span className="text-base font-semibold text-[var(--color-ink)]">
          IdeoTrack
        </span>
      </div>

      <nav className="flex-1 overflow-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                  : "text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-accent)]" />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--color-border)]">
        <button
          onClick={logout}
          className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] transition-colors"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}

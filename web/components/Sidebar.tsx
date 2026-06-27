"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Quote,
  BookOpen,
  Building2,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "数据概览", icon: LayoutDashboard },
  { href: "/tasks", label: "任务管理", icon: ClipboardList },
  { href: "/learning-resources", label: "学习资料", icon: BookOpen },
  { href: "/quotes", label: "名言管理", icon: Quote },
  { href: "/organizations", label: "组织架构", icon: Building2 },
  { href: "/users", label: "用户管理", icon: Users },
  { href: "/operations", label: "系统运维", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    onCloseMobile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col transition-transform duration-200 ease-out",
          "-translate-x-full lg:translate-x-0",
          mobileOpen && "translate-x-0"
        )}
        aria-label="主导航"
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[var(--color-border)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center mr-3">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
            IdeoTrack
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                    : "text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-ink)]"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="w-[1.125rem] h-[1.125rem] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer / version */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-ink-muted)]">
            IdeoTrack 管理后台
          </p>
        </div>
      </aside>
    </>
  );
}

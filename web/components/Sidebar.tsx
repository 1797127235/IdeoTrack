'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/api';

const navItems = [
  { href: '/', label: '概览', icon: '📊' },
  { href: '/tasks', label: '任务管理', icon: '📋' },
  { href: '/quotes', label: '名言管理', icon: '💬' },
  { href: '/organizations', label: '组织结构', icon: '🏛️' },
  { href: '/users', label: '用户管理', icon: '👥' },
  { href: '/reports', label: '报表统计', icon: '📈' },
  { href: '/operations', label: '运维管理', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-60 bg-white border-r border-[#E2E8F0] flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-[#E2E8F0]">
        <h1 className="text-xl font-bold text-[#164E63]">思政打卡管理</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#ECFEFF] text-[#0891B2]'
                      : 'text-[#64748B] hover:bg-[#F0FDFF] hover:text-[#164E63]'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors"
        >
          <span>🚪</span>
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}

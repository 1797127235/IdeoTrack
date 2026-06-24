"use client";

import Link from "next/link";
import { getToken } from "@/lib/api";
import { decodeJwtPayload } from "@/lib/jwt";
import { useState, useEffect } from "react";

const modules = [
  { href: "/dashboard", label: "概览", icon: "📊", description: "查看系统概览和统计数据" },
  { href: "/tasks", label: "任务管理", icon: "📋", description: "创建、编辑和管理思政学习任务" },
  { href: "/quotes", label: "名言管理", icon: "💬", description: "管理每日名言库和展示配置" },
  { href: "/organizations", label: "组织结构", icon: "🏛️", description: "管理学院、班级等组织架构" },
  { href: "/users", label: "用户管理", icon: "👥", description: "管理学生、辅导员和管理员账号" },
  { href: "/reports", label: "报表统计", icon: "📈", description: "查看多维度数据统计和导出报表" },
  { href: "/operations", label: "运维管理", icon: "⚙️", description: "系统配置、日志和运维管理" },
];

/**
 * 管理后台首页（Story 14.2）。
 * 展示模块卡片入口，点击跳转到对应模块。
 */
export default function AdminHome() {
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const token = getToken();
    const payload = token ? decodeJwtPayload(token) : null;
    setUserId(payload?.userId || "");
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#164E63]">思政打卡 · 管理后台</h1>
        <p className="text-[#64748B] mt-2">欢迎，管理员（{userId.slice(0, 8)}…）</p>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group block bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl">{module.icon}</span>
              <h2 className="text-lg font-semibold text-[#164E63] group-hover:text-[#0891B2] transition-colors">
                {module.label}
              </h2>
            </div>
            <p className="text-sm text-[#64748B]">{module.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

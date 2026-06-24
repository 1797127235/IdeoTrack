"use client";

import Link from "next/link";

const modules = [
  { href: "/", label: "概览", description: "全局数据总览与快捷入口" },
  { href: "/tasks", label: "任务", description: "创建、编辑和管理学习任务" },
  { href: "/quotes", label: "名言", description: "管理每日名言库与展示" },
  { href: "/organizations", label: "组织", description: "管理学院、班级等架构" },
  { href: "/users", label: "用户", description: "管理学生、辅导员、管理员" },
  { href: "/reports", label: "报表", description: "多维度统计与导出" },
  { href: "/operations", label: "运维", description: "系统配置、日志与运维" },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#164E63]">管理员控制台</h1>
        <p className="text-[#64748B] mt-2">请选择要管理的模块</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-start">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group flex flex-col justify-center w-[200px] h-[150px] bg-white rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#ECFEFF]"
          >
            <h2 className="text-lg font-semibold text-[#164E63] group-hover:text-[#0891B2] transition-colors">
              {module.label}
            </h2>
            <p className="text-sm text-[#64748B] mt-2 line-clamp-2">
              {module.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

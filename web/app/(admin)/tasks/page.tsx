"use client";

import Link from "next/link";

export default function TasksPage() {
  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#164E63]">任务管理</h1>
          <p className="text-[#64748B] mt-2">创建、编辑和管理思政学习任务</p>
        </div>
        <Link
          href="/tasks/create"
          className="px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#164E63] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#ECFEFF]"
        >
          新建任务
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
        <p className="text-[#64748B]">任务列表功能开发中，请先使用「新建任务」创建任务。</p>
      </div>
    </div>
  );
}

"use client";

import DataTable from "@/components/DataTable";
import { operations } from "@/lib/data";

export default function OperationsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="搜索操作内容"
          className="h-10 w-72 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <select className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
          <option>全部操作</option>
          <option>创建</option>
          <option>修改</option>
          <option>导出</option>
          <option>禁用</option>
        </select>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <DataTable
          columns={[
            { key: "time", header: "时间" },
            { key: "user", header: "操作人" },
            { key: "action", header: "操作" },
            { key: "target", header: "对象" },
          ]}
          rows={operations}
          rowKey={(row) => row.id}
        />
      </div>
    </div>
  );
}

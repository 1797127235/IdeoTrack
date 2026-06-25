"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type MultiDimStats, type ReportScope } from "@/lib/reports";
import { type College, type Class } from "@/lib/users";

interface ReportsFilterFormProps {
  initialStats: MultiDimStats[];
  colleges: College[];
  classes: Class[];
  initialScope: ReportScope;
  initialScopeId: string;
  initialStartDate: string;
  initialEndDate: string;
}

export default function ReportsFilterForm({
  initialStats,
  colleges,
  classes,
  initialScope,
  initialScopeId,
  initialStartDate,
  initialEndDate,
}: ReportsFilterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [scope, setScope] = useState<ReportScope>(initialScope);
  const [scopeId, setScopeId] = useState(initialScopeId);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", scope);
    if (scopeId) {
      params.set("scopeId", scopeId);
    } else {
      params.delete("scopeId");
    }
    if (startDate) {
      params.set("startDate", startDate);
    } else {
      params.delete("startDate");
    }
    if (endDate) {
      params.set("endDate", endDate);
    } else {
      params.delete("endDate");
    }
    router.push(`/reports?${params.toString()}`);
  };

  const exportExcel = () => {
    alert("导出功能即将上线");
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">统计范围</label>
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as ReportScope);
              setScopeId("");
            }}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="school">全校</option>
            <option value="college">学院</option>
            <option value="class">班级</option>
          </select>
        </div>

        {scope === "college" && (
          <div>
            <label className="block text-xs text-[var(--color-ink-muted)] mb-1">学院</label>
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">全部学院</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === "class" && (
          <div>
            <label className="block text-xs text-[var(--color-ink-muted)] mb-1">班级</label>
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">全部班级</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.collegeName} - {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
        >
          查询
        </button>
        <button
          type="button"
          onClick={exportExcel}
          className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm"
        >
          导出 Excel
        </button>
      </form>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">范围</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">学生数</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">已打卡</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">打卡率</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">未打卡</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">心得数</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">AI 通过</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">人工复核</th>
            </tr>
          </thead>
          <tbody>
            {initialStats.map((row) => (
              <tr key={row.scopeId || row.scope} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-3 text-[var(--color-ink)]">{row.scopeName}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{row.totalStudents}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{row.checkInCount}</td>
                <td className="py-3 text-[var(--color-ink)] font-medium">{row.checkInRate}%</td>
                <td className="py-3 text-[var(--color-danger)]">{row.absentCount}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{row.reflectionCount}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{row.aiApprovedCount}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{row.manualReviewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

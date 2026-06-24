"use client";

import { useEffect, useState } from "react";
import { getMultiDimStats, type MultiDimStats, type ReportScope } from "@/lib/reports";
import { listColleges, listClasses, type College, type Class } from "@/lib/users";

export default function ReportsPage() {
  const [stats, setStats] = useState<MultiDimStats[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [scope, setScope] = useState<ReportScope>("school");
  const [scopeId, setScopeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadStats = () => {
    setLoading(true);
    getMultiDimStats({
      scope,
      scopeId: scopeId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((data) => {
        setStats(data);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    Promise.all([listColleges(), listClasses()])
      .then(([c, cl]) => {
        setColleges(c);
        setClasses(cl);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
      });

    getMultiDimStats({ scope: "school" })
      .then((data) => {
        setStats(data);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadStats();
  };

  const exportExcel = () => {
    alert("导出功能即将上线");
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSearch} className="flex items-end gap-3">
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
        {loading ? (
          <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>
        ) : (
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
              {stats.map((row) => (
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
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type MultiDimStats, type ReportScope } from "@/lib/reports";
import { type College, type Class } from "@/lib/users";
import { Button, Card, EmptyState, FormField, Input, Select } from "@/components/ui";
import { FileBarChart, Search } from "lucide-react";

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

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <FormField label="统计范围" htmlFor="scope" className="min-w-[120px] flex-1 sm:flex-none">
            <Select
              id="scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as ReportScope);
                setScopeId("");
              }}
            >
              <option value="school">全校</option>
              <option value="college">学院</option>
              <option value="class">班级</option>
            </Select>
          </FormField>

          {scope === "college" && (
            <FormField label="学院" htmlFor="college" className="min-w-[160px] flex-1 sm:flex-none">
              <Select id="college" value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
                <option value="">全部学院</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {scope === "class" && (
            <FormField label="班级" htmlFor="class" className="min-w-[200px] flex-1 sm:flex-none">
              <Select id="class" value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
                <option value="">全部班级</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.collegeName} - {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label="开始日期" htmlFor="startDate" className="min-w-[140px] flex-1 sm:flex-none">
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormField>

          <FormField label="结束日期" htmlFor="endDate" className="min-w-[140px] flex-1 sm:flex-none">
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormField>

          <Button type="submit" className="w-full sm:w-auto">
            <Search className="w-4 h-4" />
            查询
          </Button>
        </form>
      </Card>

      <Card className="p-4 sm:p-6">
        {initialStats.length === 0 ? (
          <EmptyState
            title="暂无统计数据"
            description="请调整筛选条件后重新查询"
            icon={<FileBarChart className="w-6 h-6 text-[var(--color-ink-muted)]" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-medium">
                    范围
                  </th>
                  <th className="text-right py-2 text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-medium">
                    学生数
                  </th>
                  <th className="text-right py-2 text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-medium">
                    已打卡
                  </th>
                  <th className="text-right py-2 text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-medium">
                    打卡率
                  </th>
                  <th className="text-right py-2 text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-medium">
                    未打卡
                  </th>
                  <th className="text-right py-2 text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-medium">
                    心得数
                  </th>
                  <th className="text-right py-2 text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-medium">
                    AI 通过
                  </th>
                  <th className="text-right py-2 text-xs uppercase tracking-wider text-[var(--color-ink-muted)] font-medium">
                    人工复核
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialStats.map((row) => (
                  <tr key={row.scopeId || row.scope} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-ink)]">{row.scopeName}</td>
                    <td className="py-3 text-right text-[var(--color-ink-secondary)]">{row.totalStudents}</td>
                    <td className="py-3 text-right text-[var(--color-ink-secondary)]">{row.checkInCount}</td>
                    <td className="py-3 text-right text-[var(--color-ink)] font-medium">{row.checkInRate}%</td>
                    <td className="py-3 text-right text-[var(--color-danger)]">{row.absentCount}</td>
                    <td className="py-3 text-right text-[var(--color-ink-secondary)]">{row.reflectionCount}</td>
                    <td className="py-3 text-right text-[var(--color-ink-secondary)]">{row.aiApprovedCount}</td>
                    <td className="py-3 text-right text-[var(--color-ink-secondary)]">{row.manualReviewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

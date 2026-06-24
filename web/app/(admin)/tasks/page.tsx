"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTasks, delistTask, type Task, scopeLabel, statusLabel } from "@/lib/tasks";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = () => {
    listTasks()
      .then((data) => {
        setTasks(data);
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
    loadData();
  }, []);

  const handleDelist = (id: string) => {
    if (!confirm("确定下架该任务？")) return;
    delistTask(id)
      .then(() => loadData())
      .catch((err) => setError(err instanceof Error ? err.message : "下架失败"));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>;
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">任务管理</h2>
        <Link
          href="/tasks/create"
          className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium flex items-center"
        >
          新建任务
        </Link>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">任务名称</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">范围</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">发布时间</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">截止时间</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">状态</th>
              <th className="text-left py-2 text-[var(--color-ink-muted)] font-medium">完成率</th>
              <th className="text-right py-2 text-[var(--color-ink-muted)] font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-3 text-[var(--color-ink)]">{task.title}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{scopeLabel(task)}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{formatDate(task.published_at)}</td>
                <td className="py-3 text-[var(--color-ink-secondary)]">{formatDate(task.deadline_at)}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.status === "published"
                        ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabel(task.status)}
                  </span>
                </td>
                <td className="py-3 text-[var(--color-ink-secondary)]">
                  {task.completion_rate !== undefined ? `${Math.round(task.completion_rate)}%` : "-"}
                </td>
                <td className="py-3 text-right space-x-3">
                  <Link
                    href={`/tasks/${task.id}/edit`}
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    编辑
                  </Link>
                  {task.status === "published" && (
                    <button
                      onClick={() => handleDelist(task.id)}
                      className="text-[var(--color-danger)] hover:underline"
                    >
                      下架
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

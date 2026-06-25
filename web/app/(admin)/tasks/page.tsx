"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listTasks,
  delistTask,
  type Task,
  type TaskStatus,
  type TaskScopeType,
  scopeLabel,
  statusLabel,
} from "@/lib/tasks";

const PAGE_SIZE = 20;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface TaskQuery {
  page: number;
  status: TaskStatus | "";
  scopeType: TaskScopeType | "";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState<TaskQuery>({
    page: 1,
    status: "",
    scopeType: "",
  });

  useEffect(() => {
    let cancelled = false;
    listTasks({
      status: query.status || undefined,
      scopeType: query.scopeType || undefined,
      page: query.page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setTasks(result.items);
        setTotal(result.total);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const updateQuery = (patch: Partial<TaskQuery>) => {
    setLoading(true);
    setQuery((prev) => ({
      ...prev,
      ...patch,
      page: patch.page ?? 1,
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ page: 1 });
  };

  const handleReset = () => {
    setKeyword("");
    updateQuery({ status: "", scopeType: "", page: 1 });
  };

  const handleDelist = (id: string) => {
    if (!confirm("确定下架该任务？")) return;
    delistTask(id)
      .then(() => {
        updateQuery({ page: query.page });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "下架失败"));
  };

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(normalizedKeyword)
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">任务管理</h2>
        <Link
          href="/tasks/create"
          className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium flex items-center"
        >
          新建任务
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-wrap items-end gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4"
      >
        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">关键词</label>
          <input
            type="text"
            placeholder="搜索任务名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">状态</label>
          <select
            value={query.status}
            onChange={(e) => updateQuery({ status: e.target.value as TaskStatus | "", page: 1 })}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">全部</option>
            <option value="published">进行中</option>
            <option value="delisted">已下架</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--color-ink-muted)] mb-1">范围</label>
          <select
            value={query.scopeType}
            onChange={(e) => updateQuery({ scopeType: e.target.value as TaskScopeType | "", page: 1 })}
            className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">全部</option>
            <option value="school">全校</option>
            <option value="college">学院</option>
            <option value="class">班级</option>
            <option value="pool">任务池</option>
          </select>
        </div>

        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium"
        >
          查询
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm"
        >
          重置
        </button>
      </form>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        {loading ? (
          <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>
        ) : (
          <>
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
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-sm text-[var(--color-ink-secondary)]"
                    >
                      暂无任务
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
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
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="text-sm text-[var(--color-ink-secondary)]">
                  共 {total} 条，第 {query.page} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={query.page <= 1}
                    onClick={() => updateQuery({ page: query.page - 1 })}
                    className="h-9 px-3 rounded-lg border border-[var(--color-border)] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={query.page >= totalPages}
                    onClick={() => updateQuery({ page: query.page + 1 })}
                    className="h-9 px-3 rounded-lg border border-[var(--color-border)] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
